const Note = require('../models/Note');

const noteMap = new Map(); // maps url -> content
let timer = null; // global timer reference

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
    return roomData ? roomData.size : 0;
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
    console.log('Client connected:', socket.id);
    let currentNoteUrl = null;

    socket.on('joinNote', async (url) => {
      try {
        currentNoteUrl = url;
        socket.join(url);

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

    socket.on('disconnect', () => {
      if (currentNoteUrl) {
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
