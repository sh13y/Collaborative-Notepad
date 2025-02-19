const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Note = require('../models/Note');
const bcrypt = require('bcrypt');

// Middleware to check if admin is logged in
const requireAuth = async (req, res, next) => {
    if (!req.session.isAdmin) {
        return res.redirect('/admin/login');
    }
    next();
};

// Admin login page
router.get('/admin/login', async (req, res) => {
    const adminExists = await Admin.findOne({});
    res.render('admin/login', { firstTime: !adminExists });
});

// Handle login/first-time setup
router.post('/admin/login', async (req, res) => {
    const { password } = req.body;
    
    try {
        let admin = await Admin.findOne({});
        
        if (!admin) {
            // First time setup
            const hashedPassword = await bcrypt.hash(password, 10);
            admin = new Admin({ password: hashedPassword });
            await admin.save();
            req.session.isAdmin = true;
            return res.redirect('/admin');
        }
        
        // Regular login
        const match = await bcrypt.compare(password, admin.password);
        if (match) {
            req.session.isAdmin = true;
            res.redirect('/admin');
        } else {
            res.render('admin/login', { error: 'Invalid password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('admin/login', { error: 'An error occurred' });
    }
});

// Admin dashboard
router.get('/admin', requireAuth, async (req, res) => {
    try {
        // Get all notes, sorted by last updated
        const notes = await Note.find({})
            .sort({ updatedAt: -1 })
            .select('url content updatedAt')
            .lean();
        
        let activeNotesCount = 0;
        try {
            const io = req.app.get('io');
            if (io && io.sockets) {
                const rooms = io.sockets.adapter.rooms;
                activeNotesCount = Array.from(rooms.keys())
                    .filter(room => !room.startsWith('/'))  // Filter out socket.io internal rooms
                    .length;
            }
        } catch (error) {
            console.error('Error getting active notes count:', error);
        }
        
        res.render('admin/dashboard', { 
            notes,
            activeNotesCount,
            error: null
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('admin/dashboard', { 
            notes: [],
            activeNotesCount: 0,
            error: 'Failed to load dashboard'
        });
    }
});

// Reset password
router.post('/admin/reset-password', requireAuth, async (req, res) => {
    try {
        await Admin.deleteOne({});
        req.session.destroy();
        res.redirect('/admin/login');
    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Logout
router.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

module.exports = router; 