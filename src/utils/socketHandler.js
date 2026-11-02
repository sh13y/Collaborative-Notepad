const Note = require('../models/Note');
const NoteUpdate = require('../models/NoteUpdate');
const Y = require('yjs');
const bcrypt = require('bcrypt');
const { loadDocument, encodeState, decodeUpdate } = require('./collaborationState');

const roomDocuments = new Map();
const roomUpdateQueues = new Map();

// Cursor management - maps room -> { userId -> cursor data }
const roomCursors = new Map();

// Server-side cursor throttling (50ms = 20 broadcasts/sec max per user)
const cursorThrottleTimers = new Map(); // socket.id -> timeout
const pendingCursorPositions = new Map(); // socket.id -> { position, timestamp }

// Color palette for user cursors
const cursorColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

// User emojis for fun visual identification
const userEmojis = ['🦊', '🐼', '🦄', '🐸', '🦉', '🐙', '🐨', '🦁'];

// Helper function to assign unique color to user
function assignUserColor(room, userId) {
  const cursors = roomCursors.get(room) || new Map();
  const usedColors = new Set(Array.from(cursors.values()).map(c => c.color));
  
  // Try to assign based on user ID hash for consistency across reconnections
  const userIdHash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Find first available color, or use hash-based assignment
  for (const color of cursorColors) {
    if (!usedColors.has(color)) return color;
  }
  
  // If all colors used, assign based on user ID hash for consistency
  return cursorColors[Math.abs(userIdHash) % cursorColors.length];
}

// Helper function to assign emoji to user
function assignUserEmoji(room, userId) {
  const cursors = roomCursors.get(room) || new Map();
  const usedEmojis = new Set(Array.from(cursors.values()).map(c => c.emoji));
  
  // Try to assign based on user ID hash for consistency across reconnections
  const userIdHash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Find first available emoji, or use hash-based assignment
  for (const emoji of userEmojis) {
    if (!usedEmojis.has(emoji)) return emoji;
  }
  
  // If all emojis used, assign based on user ID hash for consistency
  return userEmojis[Math.abs(userIdHash) % userEmojis.length];
}

// Helper function to generate username
function generateUsername(emoji, userId) {
  const shortId = userId.substring(0, 4);
  const names = ['Fox', 'Panda', 'Unicorn', 'Frog', 'Owl', 'Octopus', 'Koala', 'Lion'];
  const emojiIndex = userEmojis.indexOf(emoji);
  const name = names[emojiIndex] || 'User';
  return `${emoji} ${name}`;
}

const setupSocket = (io) => {
  // Track room sizes
  const getRoomSize = (room) => {
    const roomData = io.sockets.adapter.rooms.get(room);
    if (!roomData) return 0;

    const uniqueBrowsers = new Set();

    for (const socketId of roomData) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.handshake.query.browserId) {
        uniqueBrowsers.add(socket.handshake.query.browserId);
      }
    }

    return uniqueBrowsers.size;
  };

  // Function to broadcast admin stats
  const broadcastAdminStats = () => {
    const rooms = io.sockets.adapter.rooms;
    const activeNotes = Array.from(rooms.keys())
      .filter(room => !room.startsWith('/'))
      .length;

    io.emit('adminStats', {
      activeNotes
    });
  };

  io.on('connection', async (socket) => {
    const browserId = socket.handshake.query.browserId || socket.id; 
    console.log('Client connected:', socket.id, 'Browser ID:', browserId);

    let currentNoteUrl = null;
    let userCursorData = null; // Store user's cursor info
    let currentDocument = null;
    let canEdit = true;
    let canView = true;
    let isOwner = false;

    const emitDocument = () => {
      socket.emit('loadNoteState', {
        content: currentDocument.getText('content').toString(),
        state: encodeState(currentDocument)
      });
    };

    // Latency measurement: immediately acknowledge so client can measure RTT
    socket.on('ping-latency', (callback) => {
      if (typeof callback === 'function') callback();
    });
    
    socket.on('joinNote', async (url) => {
      try {
        currentNoteUrl = url;
        socket.data.currentNoteUrl = url;
        socket.join(url);

        // Initialize cursor map for this room if not exists
        if (!roomCursors.has(url)) {
          roomCursors.set(url, new Map());
        }

        // Assign color and emoji to this user
        const color = assignUserColor(url, socket.id);
        const emoji = assignUserEmoji(url, socket.id);
        const username = generateUsername(emoji, socket.id);
        
        // Create user cursor data
        userCursorData = {
          userId: socket.id,
          browserId: browserId,
          color: color,
          emoji: emoji,
          username: username,
          lastPosition: null,
          timestamp: Date.now()
        };

        // Add user to room's cursor map
        roomCursors.get(url).set(socket.id, userCursorData);

        // Get note content from MongoDB
        let note = await Note.findOne({ url });
        if (note) {
          if (!note.ownerBrowserId) {
            const claimedNote = await Note.findOneAndUpdate(
              { _id: note._id, ownerBrowserId: null },
              { ownerBrowserId: browserId },
              { new: true }
            );
            note = claimedNote || await Note.findById(note._id);
          }
          isOwner = note.ownerBrowserId === browserId;
          socket.data.noteAuthenticated = isOwner;
          canView = isOwner || !note.viewRequiresPin;
          canEdit = isOwner || !note.editRequiresPin;
          socket.data.canView = canView;
          socket.data.canEdit = canEdit;
          socket.emit('lockStatus', {
            viewRequiresPin: note.viewRequiresPin,
            editRequiresPin: note.editRequiresPin,
            hasPin: Boolean(note.pinHash),
            isOwner,
            authenticated: socket.data.noteAuthenticated,
            canView,
            canEdit
          });
          if (!roomDocuments.has(url)) {
            roomDocuments.set(url, await loadDocument(url, note.content || ''));
          }
          currentDocument = roomDocuments.get(url);
          if (canView) emitDocument();
          else socket.emit('lockRequired', { access: 'view' });

          // Get real-time count of users in the room
          const userCount = getRoomSize(url);

          // Broadcast updated user count to all clients in this note
          io.to(url).emit('userCount', userCount);
        }

        // Send existing cursors to the new user
        const existingCursors = Array.from(roomCursors.get(url).values())
          .filter(c => c.userId !== socket.id);
        socket.emit('existing-cursors', existingCursors);

        // Broadcast cursor-join to all other users in room
        socket.to(url).emit('cursor-join', {
          userId: socket.id,
          browserId: browserId,
          color: color,
          emoji: emoji,
          username: username,
          room: url,
          timestamp: Date.now()
        });

        // Broadcast updated stats to admin
        broadcastAdminStats();
      } catch (error) {
        console.error('Error handling join:', error);
        socket.emit('error', 'Failed to join note');
      }
    });

    socket.on('updateNote', async (data) => {
      try {
        if (!currentDocument || data.url !== currentNoteUrl) {
          throw new Error('Socket has not joined this note');
        }
        if (!socket.data.canEdit) {
          socket.emit('lockRequired', { access: 'edit' });
          return;
        }

        const update = decodeUpdate(data.update);
        const updateId = typeof data.updateId === 'string' ? data.updateId : null;
        if (!updateId) {
          throw new Error('Missing collaboration update ID');
        }

        const previousQueue = roomUpdateQueues.get(data.url) || Promise.resolve();
        const updateTask = previousQueue.then(async () => {
          try {
            await NoteUpdate.create({
              noteUrl: data.url,
              updateId,
              update
            });
          } catch (error) {
            if (error.code === 11000) return false;
            throw error;
          }

                  // Apply to in-memory document FIRST (immediate)
                  Y.applyUpdate(currentDocument, new Uint8Array(update));
          
                  // Broadcast IMMEDIATELY to other clients (before DB write)
          for (const roomSocket of io.sockets.sockets.values()) {
            if (roomSocket.id !== socket.id &&
                roomSocket.data.currentNoteUrl === data.url &&
                roomSocket.data.canView) {
              roomSocket.emit('crdt-update', data.update);
            }
          }

                  // Then persist to DB asynchronously (non-blocking)
                  const content = currentDocument.getText('content').toString();
                  Note.findOneAndUpdate({ url: data.url }, { content }).catch(err => {
                    console.error('Failed to persist note content:', err);
                  });

                  return true;
                });
                const queuedTask = updateTask.catch(() => undefined);
                roomUpdateQueues.set(data.url, queuedTask);
                try {
                  await updateTask;
                } finally {
                  if (roomUpdateQueues.get(data.url) === queuedTask) {
                    roomUpdateQueues.delete(data.url);
                  }
                }
      } catch (error) {
        console.error('Error updating note:', error);
        socket.emit('error', 'Failed to update note');
      }
    });

    socket.on('authenticateNote', async ({ pin } = {}) => {
      try {
        if (!currentNoteUrl || !/^\d{4}$/.test(pin || '')) {
          socket.emit('lockError', 'Enter a valid 4-digit PIN');
          return;
        }
        const note = await Note.findOne({ url: currentNoteUrl }).select('pinHash viewRequiresPin editRequiresPin');
        if (!note || !note.pinHash || !(await bcrypt.compare(pin, note.pinHash))) {
          socket.emit('lockError', 'Incorrect PIN');
          return;
        }
        canView = true;
        canEdit = true;
        socket.data.canView = true;
        socket.data.canEdit = true;
        socket.data.noteAuthenticated = true;
        socket.emit('lockStatus', {
          viewRequiresPin: note.viewRequiresPin,
          editRequiresPin: note.editRequiresPin,
          isOwner: false,
          authenticated: true,
          canView,
          canEdit
        });
        socket.emit('lockAuthenticated');
        if (currentDocument) emitDocument();
      } catch (error) {
        console.error('Error authenticating note:', error);
        socket.emit('lockError', 'Unable to verify PIN');
      }
    });

    socket.on('updateLock', async ({ pin, oldPin, viewRequiresPin = false, editRequiresPin = false } = {}) => {
      try {
        let note = await Note.findOne({ url: currentNoteUrl });
        if (!note) {
          socket.emit('lockError', 'Note not found');
          return;
        }

        // Claim ownership if not claimed yet
        if (!note.ownerBrowserId) {
          note.ownerBrowserId = browserId;
          await note.save();
        }

        const noteIsLocked = Boolean(note.pinHash && (note.viewRequiresPin || note.editRequiresPin));

        // If note is already locked, verify current PIN:
        if (noteIsLocked) {
          if (!/^\d{4}$/.test(oldPin || '') || !(await bcrypt.compare(oldPin, note.pinHash))) {
            socket.emit('lockError', 'Current PIN is incorrect');
            return;
          }
          // Authorized by PIN verification -> claim/confirm ownership
          note.ownerBrowserId = browserId;
        } else if (note.ownerBrowserId !== browserId) {
          // If note is unlocked, allow the current user to set a lock and claim ownership
          note.ownerBrowserId = browserId;
        }

        const isEnabling = Boolean(viewRequiresPin || editRequiresPin);
        let finalPin = pin;
        if (isEnabling) {
          // If note is already locked and owner didn't enter a new pin, keep the old verified pin
          if (noteIsLocked && (!pin || !pin.trim()) && oldPin) {
            finalPin = oldPin;
          }
          if (!/^\d{4}$/.test(finalPin || '')) {
            socket.emit('lockError', 'A 4-digit PIN is required');
            return;
          }
        }
        note.viewRequiresPin = Boolean(viewRequiresPin);
        note.editRequiresPin = Boolean(editRequiresPin);
        note.pinHash = isEnabling ? await bcrypt.hash(finalPin, 10) : null;
        await note.save();

        const hasPin = Boolean(note.pinHash);
        canView = true;
        canEdit = true;
        for (const roomSocket of io.sockets.sockets.values()) {
          if (roomSocket.data.currentNoteUrl === currentNoteUrl) {
            const isOwner = roomSocket.handshake.query.browserId === note.ownerBrowserId;
            roomSocket.data.canView = isOwner || note.viewRequiresPin === false;
            roomSocket.data.canEdit = isOwner || note.editRequiresPin === false;
            roomSocket.data.noteAuthenticated = isOwner;
            roomSocket.emit('lockChanged', {
              viewRequiresPin: note.viewRequiresPin,
              editRequiresPin: note.editRequiresPin,
              hasPin,
              isOwner,
              authenticated: roomSocket.data.noteAuthenticated,
              canView: roomSocket.data.canView,
              canEdit: roomSocket.data.canEdit
            });
          }
        }
        socket.emit('lockStatus', {
          viewRequiresPin: note.viewRequiresPin,
          editRequiresPin: note.editRequiresPin,
          hasPin,
          isOwner: true,
          authenticated: true,
          canView: true,
          canEdit: true
        });
        socket.emit('lockSaved');
      } catch (error) {
        console.error('Error updating note lock:', error);
        socket.emit('lockError', 'Unable to update lock settings');
      }
    });

    // Handle cursor movement events (with server-side throttling)
    socket.on('cursor-move', (data) => {
      try {
        if (!currentNoteUrl) return;

            const position = data.position;
            const timestamp = data.timestamp || Date.now();

            // Update cursor data in memory immediately
            const cursors = roomCursors.get(currentNoteUrl);
            if (cursors && cursors.has(socket.id)) {
              const cursorData = cursors.get(socket.id);
              cursorData.lastPosition = position;
              cursorData.timestamp = timestamp;
              cursors.set(socket.id, cursorData);
            }

            // Store pending position for throttled broadcast
            pendingCursorPositions.set(socket.id, { position, timestamp, room: currentNoteUrl });

            // If already throttling, skip - the timer will broadcast the latest position
            if (cursorThrottleTimers.has(socket.id)) return;

            // Set up throttle timer (50ms = 20 broadcasts/sec max)
            const timer = setTimeout(() => {
              cursorThrottleTimers.delete(socket.id);
              const pending = pendingCursorPositions.get(socket.id);
              if (pending) {
                pendingCursorPositions.delete(socket.id);
                socket.to(pending.room).emit('cursor-move', {
                  userId: socket.id,
                  browserId: browserId,
                  position: pending.position,
                  room: pending.room,
                  timestamp: pending.timestamp
                });
              }
            }, 50);

            cursorThrottleTimers.set(socket.id, timer);
          } catch (error) {
            console.error('Error handling cursor move:', error);
          }
        });

    socket.on('disconnect', () => {
          // Flush any pending cursor position before disconnect
          if (cursorThrottleTimers.has(socket.id)) {
            clearTimeout(cursorThrottleTimers.get(socket.id));
            cursorThrottleTimers.delete(socket.id);
            const pending = pendingCursorPositions.get(socket.id);
            if (pending) {
              pendingCursorPositions.delete(socket.id);
              socket.to(pending.room).emit('cursor-move', {
                userId: socket.id,
                browserId: browserId,
                position: pending.position,
                room: pending.room,
                timestamp: pending.timestamp
              });
            }
          }

          if (currentNoteUrl) {
            // Broadcast cursor-leave to all users in room
            socket.to(currentNoteUrl).emit('cursor-leave', {
              userId: socket.id,
              browserId: browserId,
              room: currentNoteUrl,
              timestamp: Date.now()
            });

            // Clean up cursor data
            const cursors = roomCursors.get(currentNoteUrl);
            if (cursors) {
              cursors.delete(socket.id);
          
              // Clean up empty room maps
              if (cursors.size === 0) {
                roomCursors.delete(currentNoteUrl);
              }
            }

            const userCount = getRoomSize(currentNoteUrl);
            io.to(currentNoteUrl).emit('userCount', userCount);
          }
          // Broadcast updated stats to admin after disconnect
          broadcastAdminStats();
          console.log('Client disconnected:', socket.id);
        });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

module.exports = { setupSocket };
