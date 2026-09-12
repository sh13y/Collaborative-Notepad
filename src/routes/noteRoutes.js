const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const rateLimit = require('express-rate-limit');

// Rate limiting for note creation
const createNoteLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 note creations per windowMs
    message: {
        error: 'Too many notes created from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Robots.txt - Prevent indexing of admin paths and sensitive areas
router.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Disallow: /admin*
Disallow: /*admin*
Disallow: /api/
Disallow: /socket.io/
Disallow: /*.json$
Disallow: /*?*
Allow: /
Allow: /new
Allow: /css/
Allow: /js/

# Security note: This notepad creates dynamic URLs
# Each note has a unique URL like /your-note-name
Crawl-delay: 10

Sitemap: ${req.protocol}://${req.get('host')}/sitemap.xml`);
});

// Security.txt for responsible disclosure
router.get('/security.txt', (req, res) => {
    res.type('text/plain');
    res.send(`Contact: https://github.com/sh13y/Collaborative-Notepad/issues
Expires: 2025-12-31T23:59:59.000Z
Preferred-Languages: en
Policy: Please report security vulnerabilities responsibly via GitHub issues.`);
});

// Sitemap.xml
router.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${req.protocol}://${req.get('host')}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${req.protocol}://${req.get('host')}/new</loc>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>`);
});

// Health check endpoint to prevent unwanted note creation
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', service: 'Collaborative Notepad' });
});

// Favicon route to prevent 404s
router.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Robots.txt to guide crawlers
router.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /new
Disallow: /*/*

Sitemap: https://collabnote.link/sitemap.xml`);
});

// Serve the root route
router.get('/', (req, res) => {
    res.redirect('/new');
});

// Serve the main page with a unique URL
router.get('/new', createNoteLimit, async (req, res) => {
    // Check if request is from a bot or crawler
    const userAgent = req.get('User-Agent') || '';
    const isBot = /bot|crawler|spider|crawling|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|slurp|bingbot|googlebot|yandexbot|duckduckbot|baiduspider/i.test(userAgent);
    
    if (isBot) {
        console.log('Bot detected, serving static page:', userAgent);
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Collaborative Notepad</title>
                <meta name="description" content="Real-time collaborative notepad for teams and friends">
            </head>
            <body>
                <h1>Collaborative Notepad</h1>
                <p>Real-time collaborative notepad. Visit in a browser to create notes.</p>
            </body>
            </html>
        `);
    }
    
    console.log('Received request to create new note from:', userAgent);
    console.log('Request headers:', {
        'user-agent': req.get('User-Agent'),
        'referer': req.get('Referer'),
        'x-forwarded-for': req.get('X-Forwarded-For'),
        'remote-addr': req.ip
    });
    try {
        let uniqueUrl;
        let noteExists = true;

        while (noteExists) {
            uniqueUrl = Math.random().toString(36).substring(2, 15);
            console.log('Generated unique URL:', uniqueUrl);
            noteExists = await Note.exists({ url: uniqueUrl });
        }

        console.log('Creating new note with URL:', uniqueUrl);
        const note = new Note({ 
            content: '', 
            url: uniqueUrl,
            activeUsers: 0 
        });
        await note.save();
        console.log('New note saved successfully:', uniqueUrl);
        
    const redirectUrl = `/${uniqueUrl}`;
    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
    } catch (error) {
        console.error('Error creating new note:', error);
        res.status(500).render('not-found', {
            message: 'Failed to create new note. Please try again.',
            redirectUrl: '/'
        });
    }
});

// Serve the note editing page
// Reserved admin paths to prevent conflicts
const reservedAdminPaths = ['admin'];
const SECRET_ADMIN_PATH = process.env.ADMIN_SECRET_PATH || 'secret-admin-panel-x7k9m2';

router.get('/:url', async (req, res) => {
    // Prevent access to reserved admin paths as notes
    if (reservedAdminPaths.includes(req.params.url) || 
        req.params.url.startsWith('admin/') ||
        req.params.url === SECRET_ADMIN_PATH ||
        req.params.url.startsWith(SECRET_ADMIN_PATH + '/')) {
        return res.status(404).render('not-found', {
            message: 'Not found',
            redirectUrl: '/new'
        });
    }
    
    // Check for common bot/crawler patterns and block them
    const userAgent = req.get('User-Agent') || '';
    const isBot = /bot|crawler|spider|crawling|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|slurp|bingbot|googlebot|yandexbot|duckduckbot|baiduspider/i.test(userAgent);
    
    if (isBot) {
        return res.status(404).json({ error: 'Not found' });
    }
    
    try {
        const note = await Note.findOne({ url: req.params.url });
        if (!note) {
            // Instead of redirecting to /new, show 404 for non-existent notes
            return res.status(404).render('not-found', {
                message: 'Note not found! This note does not exist.',
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