const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Note = require('../models/Note');
const bcrypt = require('bcrypt');
const cleanupService = require('../utils/cleanupService');

// Middleware to check if admin is logged in
const requireAuth = async (req, res, next) => {
    // Add debugging for production
    if (process.env.NODE_ENV !== 'production') {
        console.log('Auth check - URL:', req.url, 'isAdmin:', req.session.isAdmin);
    }
    
    if (!req.session.isAdmin) {
        return res.redirect(`/${SECRET_ADMIN_PATH}/login`);
    }
    next();
};

// Secret admin path - change this to something only you know
const SECRET_ADMIN_PATH = process.env.ADMIN_SECRET_PATH || 'secret-admin-panel-x7k9m2';

// Admin login page (hidden path)
router.get(`/${SECRET_ADMIN_PATH}/login`, async (req, res) => {
    try {
        const adminExists = await Admin.findOne({});
        res.render('admin/login', { 
            firstTime: !adminExists,
            secretAdminPath: SECRET_ADMIN_PATH
        });
    } catch (error) {
        console.error('Error checking admin existence:', error);
        // If there's a DB error, assume it's first time setup
        res.render('admin/login', { 
            firstTime: true,
            secretAdminPath: SECRET_ADMIN_PATH
        });
    }
});

// Handle login/first-time setup (hidden path)
router.post(`/${SECRET_ADMIN_PATH}/login`, async (req, res) => {
    const { password } = req.body;
    
    try {
        let admin = await Admin.findOne({});
        
        if (!admin) {
            // First time setup
            const hashedPassword = await bcrypt.hash(password, 10);
            admin = new Admin({ password: hashedPassword });
            await admin.save();
            req.session.isAdmin = true;
            return res.redirect(`/${SECRET_ADMIN_PATH}`);
        }
        
        // Regular login
        const match = await bcrypt.compare(password, admin.password);
        if (match) {
            req.session.isAdmin = true;
            res.redirect(`/${SECRET_ADMIN_PATH}`);
        } else {
            res.render('admin/login', { 
                error: 'Invalid password',
                secretAdminPath: SECRET_ADMIN_PATH
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('admin/login', { 
            error: 'An error occurred',
            secretAdminPath: SECRET_ADMIN_PATH
        });
    }
});

// Admin dashboard (hidden path)
router.get(`/${SECRET_ADMIN_PATH}`, requireAuth, async (req, res) => {
    try {
        // Get all notes, sorted by last updated
        const notes = await Note.find({})
            .sort({ updatedAt: -1 })
            .select('url content updatedAt')
            .lean();
        
        // Count empty notes
        const emptyNotesCount = await Note.countDocuments({
            $or: [
                { content: '' },
                { content: /^\s*$/ }, // Only whitespace
                { content: { $exists: false } }
            ]
        });
        
        // Get cleanup stats
        const cleanupStats = await cleanupService.getCleanupStats();
        
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
            emptyNotesCount,
            cleanupStats,
            error: null,
            secretAdminPath: SECRET_ADMIN_PATH
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('admin/dashboard', { 
            notes: [],
            activeNotesCount: 0,
            emptyNotesCount: 0,
            cleanupStats: { oldEmptyNotes: 0, recentEmptyNotes: 0, totalEmptyNotes: 0 },
            error: 'Failed to load dashboard',
            secretAdminPath: SECRET_ADMIN_PATH
        });
    }
});

// Reset password (hidden path)
router.post(`/${SECRET_ADMIN_PATH}/reset-password`, requireAuth, async (req, res) => {
    try {
        await Admin.deleteOne({});
        req.session.destroy();
        res.redirect(`/${SECRET_ADMIN_PATH}/login`);
    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Delete empty notes (hidden path)
router.post(`/${SECRET_ADMIN_PATH}/delete-empty-notes`, requireAuth, async (req, res) => {
    try {
        console.log('Delete empty notes request received');
        
        // Find and delete notes with empty or whitespace-only content
        const result = await Note.deleteMany({
            $or: [
                { content: '' },
                { content: /^\s*$/ }, // Only whitespace
                { content: { $exists: false } }
            ]
        });
        
        console.log(`Deleted ${result.deletedCount} empty notes`);
        res.json({ 
            success: true, 
            message: `Successfully deleted ${result.deletedCount} empty notes`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Delete empty notes error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete empty notes' 
        });
    }
});

// Delete old empty notes (7+ days old) (hidden path)
router.post(`/${SECRET_ADMIN_PATH}/cleanup-old-empty-notes`, requireAuth, async (req, res) => {
    try {
        const result = await cleanupService.cleanupOldEmptyNotes();
        res.json(result);
    } catch (error) {
        console.error('Cleanup old empty notes error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to cleanup old empty notes' 
        });
    }
});

// Get cleanup stats (hidden path)
router.get(`/${SECRET_ADMIN_PATH}/cleanup-stats`, requireAuth, async (req, res) => {
    try {
        const stats = await cleanupService.getCleanupStats();
        res.json({ 
            success: true, 
            ...stats 
        });
    } catch (error) {
        console.error('Get cleanup stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get cleanup stats' 
        });
    }
});

// Logout (hidden path)
router.get(`/${SECRET_ADMIN_PATH}/logout`, (req, res) => {
    req.session.destroy();
    res.redirect(`/${SECRET_ADMIN_PATH}/login`);
});

// Hide old admin routes - return 404 to prevent discovery
router.get('/admin', (req, res) => {
    res.status(404).render('not-found', {
        message: 'Page not found',
        redirectUrl: '/new'
    });
});

router.get('/admin/*', (req, res) => {
    res.status(404).render('not-found', {
        message: 'Page not found',
        redirectUrl: '/new'
    });
});

module.exports = router; 