const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const path = require('path');
// Specify views directory
app.set('views', path.join(__dirname, 'views'));
// Set the view engine to EJS
app.set('view engine', 'ejs');


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log('MongoDB connection error:', err));

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // Add JSON parsing middleware
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Serve the root route
app.get('/', (req, res) => {
    res.redirect('/new'); // Redirect to the new note creation page
});

// Define Note schema
const noteSchema = new mongoose.Schema({
    content: String,
    url: { type: String, unique: true }
});
const Note = mongoose.model('Note', noteSchema);

// Serve the main page with a unique URL
app.get('/new', async (req, res) => {
    let uniqueUrl;
    let noteExists = true;

    while (noteExists) {
        uniqueUrl = Math.random().toString(36).substring(2, 15); // Generate unique URL
        noteExists = await Note.exists({ url: uniqueUrl });
    }

    const note = new Note({ content: '', url: uniqueUrl });
    await note.save();
    res.redirect(`/notes/${uniqueUrl}`);
});

// Serve the note editing page
app.get('/notes/:url', async (req, res) => {
    const note = await Note.findOne({ url: req.params.url });
    if (!note) return res.status(404).send('Note not found');
    res.render('index', { note });
});

// Set custom URL for a note
// Set custom URL for a note
app.post('/setCustomUrl/:originalUrl', async (req, res) => {
    const { url } = req.body; // New custom URL from request body
    const originalUrl = req.params.originalUrl; // Original note's URL from request parameters

    // Regular expression to validate custom URL format
    const urlPattern = /^[a-zA-Z0-9-_]+$/;  // Only alphanumeric characters, hyphens, and underscores

    // Check if the custom URL matches the pattern
    if (!urlPattern.test(url)) {
        return res.json({ success: false, message: 'Invalid URL format. Only alphanumeric characters, hyphens, and underscores are allowed.' });
    }

    // Find the current note by its original URL
    const currentNote = await Note.findOne({ url: originalUrl });

    if (!currentNote) {
        return res.status(404).json({ success: false, message: 'Current note not found.' });
    }

    // Check if the custom URL already exists
    const existingNote = await Note.findOne({ url });

    if (existingNote) {
        return res.json({ success: false, message: 'URL already taken. Please choose another.' });
    }

    currentNote.url = url; // Set the new URL
    await currentNote.save();

    res.json({ success: true, message: 'Custom URL set successfully!' });
});


// Socket.IO for real-time collaboration
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('joinNote', (url) => {
        socket.join(url);
        Note.findOne({ url }).then(note => {
            socket.emit('loadNote', note);
        });
    });

    socket.on('updateNote', async (data) => {
        await Note.updateOne({ url: data.url }, { content: data.content });
        io.to(data.url).emit('noteUpdated', data.content);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start the server
server.listen(3000, () => console.log('Server started on port 3000'));
