const Note = require('../models/Note');

const setupSocket = (io) => {
    // Track room sizes
    const getRoomSize = (room) => {
        const roomData = io.sockets.adapter.rooms.get(room);
        return roomData ? roomData.size : 0;
    };

    io.on('connection', async (socket) => {
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
            } catch (error) {
                console.error('Error handling join:', error);
            }
        });

        socket.on('updateNote', async (data) => {
            try {
                // First broadcast the update to all other clients
                socket.to(data.url).emit('noteUpdated', data.content);
                
                // Then save to database
                await Note.updateOne(
                    { url: data.url },
                    { content: data.content }
                );
            } catch (error) {
                console.error('Error updating note:', error);
            }
        });

        const handleDisconnect = async () => {
            if (currentNoteUrl) {
                try {
                    // Get updated count after disconnect
                    const userCount = getRoomSize(currentNoteUrl) - 1; // Subtract 1 as the disconnect hasn't processed yet
                    
                    // Broadcast the new user count
                    io.to(currentNoteUrl).emit('userCount', Math.max(0, userCount));
                } catch (error) {
                    console.error('Error handling disconnect:', error);
                }
            }
        };

        // Handle both disconnect and disconnecting events
        socket.on('disconnect', handleDisconnect);
        socket.on('disconnecting', handleDisconnect);
    });
};

module.exports = setupSocket; 