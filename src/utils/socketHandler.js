const Note = require('../models/Note');

const setupSocket = (io) => {
    // Track connected users for each note
    const noteUsers = new Map();

    io.on('connection', (socket) => {
        let currentNoteUrl = null;

        socket.on('joinNote', (url) => {
            currentNoteUrl = url;
            socket.join(url);

            // Initialize user count for this note if not exists
            if (!noteUsers.has(url)) {
                noteUsers.set(url, new Set());
            }
            noteUsers.get(url).add(socket.id);

            // Get current note content and user count
            Note.findOne({ url }).then(note => {
                socket.emit('loadNote', note);
                // Broadcast updated user count to all clients in this note
                const userCount = noteUsers.get(url).size;
                io.to(url).emit('userCount', userCount);
            });
        });

        socket.on('updateNote', async (data) => {
            await Note.updateOne({ url: data.url }, { content: data.content });
            io.to(data.url).emit('noteUpdated', data.content);
        });

        socket.on('disconnect', () => {
            if (currentNoteUrl && noteUsers.has(currentNoteUrl)) {
                // Remove user from the note
                noteUsers.get(currentNoteUrl).delete(socket.id);
                
                // If no users left in the note, clean up
                if (noteUsers.get(currentNoteUrl).size === 0) {
                    noteUsers.delete(currentNoteUrl);
                } else {
                    // Broadcast updated user count
                    const userCount = noteUsers.get(currentNoteUrl).size;
                    io.to(currentNoteUrl).emit('userCount', userCount);
                }
            }
        });
    });
};

module.exports = setupSocket; 