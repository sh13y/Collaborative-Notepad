const Note = require('../models/Note');

const noteMap = new Map(); // maps url -> content
let timer = null; // global timer reference

// Cursor management - maps room -> { userId -> cursor data }
const roomCursors = new Map();

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

function addNotesToDatabase() {
  if (timer) return; // prevent multiple intervals

  timer = setInterval(async () => {
    console.log("database call");

    const updates = [];

    for (const [url, content] of noteMap) {
      if (!content || content.trim() === "") {
        noteMap.delete(url);
        continue;
      }

      // schedule update
      updates.push(
        Note.findOneAndUpdate({ url }, { content }, { new: true })
      );

      // mark as processed
      noteMap.set(url, "");
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  }, 5 * 1000);
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
    
    socket.on('joinNote', async (url) => {
      try {
        currentNoteUrl = url;
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
        const note = await Note.findOne({ url });
        if (note) {
          // Send initial note content to the joining client
          socket.emit('loadNote', note);

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
        // First broadcast the update to all other clients
        socket.to(data.url).emit('noteUpdated', data.content);
        console.log("update call")
        // Then save to database
        noteMap.set(data.url, data.content)
        // await Note.findOneAndUpdate(
        //   { url: data.url },
        //   { content: data.content },
        //   { new: true }
        // );
      } catch (error) {
        console.error('Error updating note:', error);
        socket.emit('error', 'Failed to update note');
      }
    });

    // Handle cursor movement events
    socket.on('cursor-move', (data) => {
      try {
        if (!currentNoteUrl) return;

        // Update cursor data in memory
        const cursors = roomCursors.get(currentNoteUrl);
        if (cursors && cursors.has(socket.id)) {
          const cursorData = cursors.get(socket.id);
          cursorData.lastPosition = data.position;
          cursorData.timestamp = Date.now();
          cursors.set(socket.id, cursorData);
        }

        // Broadcast cursor position to all other users in room
        socket.to(currentNoteUrl).emit('cursor-move', {
          userId: socket.id,
          browserId: browserId,
          position: data.position,
          room: currentNoteUrl,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error handling cursor move:', error);
      }
    });

    socket.on('disconnect', () => {
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

module.exports = { setupSocket, addNotesToDatabase };
