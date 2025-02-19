const Note = require('../models/Note');

const setupSocket = (io) => {
    io.on('connection', async (socket) => {
        let currentNoteUrl = null;

        socket.on('joinNote', async (url) => {
            try {
                currentNoteUrl = url;
                socket.join(url);

                // Increment active users count in MongoDB
                const note = await Note.findOneAndUpdate(
                    { url },
                    { $inc: { activeUsers: 1 } },
                    { new: true }
                );

                if (note) {
                    // Send initial note content to the joining client
                    socket.emit('loadNote', note);
                    // Broadcast updated user count to all clients in this note
                    io.to(url).emit('userCount', note.activeUsers);
                }
            } catch (error) {
                console.error('Error handling join:', error);
            }
        });

        socket.on('updateNote', async (data) => {
            try {
                const note = await Note.findOneAndUpdate(
                    { url: data.url },
                    { content: data.content },
                    { new: true }
                );
                if (note) {
                    io.to(data.url).emit('noteUpdated', note.content);
                }
            } catch (error) {
                console.error('Error updating note:', error);
            }
        });

        socket.on('disconnect', async () => {
            if (currentNoteUrl) {
                try {
                    // Add a small delay to handle page refreshes
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Decrement active users count in MongoDB
                    const note = await Note.findOneAndUpdate(
                        { url: currentNoteUrl },
                        { $inc: { activeUsers: -1 } },
                        { new: true }
                    );

                    if (note) {
                        // Ensure activeUsers never goes below 0
                        if (note.activeUsers < 0) {
                            await Note.updateOne(
                                { url: currentNoteUrl },
                                { activeUsers: 0 }
                            );
                            io.to(currentNoteUrl).emit('userCount', 0);
                        } else {
                            io.to(currentNoteUrl).emit('userCount', note.activeUsers);
                        }
                    }
                } catch (error) {
                    console.error('Error handling disconnect:', error);
                }
            }
        });
    });
};

module.exports = setupSocket; 