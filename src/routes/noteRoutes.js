const express = require('express');
const router = express.Router();
const Note = require('../models/Note');

// Serve the root route
router.get('/', (req, res) => {
    res.redirect('/new');
});

// Serve the main page with a unique URL
router.get('/new', async (req, res) => {
    try {
        let uniqueUrl;
        let noteExists = true;

        while (noteExists) {
            uniqueUrl = Math.random().toString(36).substring(2, 15);
            noteExists = await Note.exists({ url: uniqueUrl });
        }

        const note = new Note({ 
            content: '', 
            url: uniqueUrl,
            activeUsers: 0 
        });
        await note.save();
        res.redirect(`/notes/${uniqueUrl}`);
    } catch (error) {
        res.status(500).json({ error: 'Error creating new note' });
    }
});

// Serve the note editing page
router.get('/notes/:url', async (req, res) => {
    try {
        const note = await Note.findOne({ url: req.params.url });
        if (!note) {
            // Flash a message and redirect to new note
            return res.render('not-found', {
                message: 'Note not found! Creating a new note for you...',
                redirectUrl: '/new'
            });
        }
        res.render('index', { note });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching note' });
    }
});

// Set custom URL for a note
router.post('/setCustomUrl/:originalUrl', async (req, res) => {
    try {
        const { url } = req.body;
        const originalUrl = req.params.originalUrl;
        const urlPattern = /^[a-zA-Z0-9-_]+$/;

        if (!urlPattern.test(url)) {
            return res.json({ 
                success: false, 
                message: 'Invalid URL format. Only alphanumeric characters, hyphens, and underscores are allowed.' 
            });
        }

        const currentNote = await Note.findOne({ url: originalUrl });
        if (!currentNote) {
            return res.status(404).json({ success: false, message: 'Current note not found.' });
        }

        const existingNote = await Note.findOne({ url });
        if (existingNote) {
            return res.json({ success: false, message: 'URL already taken. Please choose another.' });
        }

        currentNote.url = url;
        await currentNote.save();
        res.json({ success: true, message: 'Custom URL set successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router; 