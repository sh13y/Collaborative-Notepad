const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Simple in-memory session store for testing
app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Simple admin auth middleware
const requireAuth = (req, res, next) => {
    console.log('RequireAuth middleware - Session isAdmin:', req.session.isAdmin);
    if (!req.session.isAdmin) {
        console.log('Not authenticated, redirecting to login');
        return res.redirect('/admin/login');
    }
    console.log('Authenticated, proceeding to dashboard');
    next();
};

// Admin routes
app.get('/admin/test', (req, res) => {
    res.json({ message: 'Admin routes are working!', session: req.session });
});

app.get('/admin/login', (req, res) => {
    console.log('Admin login page accessed');
    res.render('admin/login', { firstTime: true, error: null });
});

app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    console.log('Login attempt with password:', password);
    
    // Simple password check for testing
    if (password === 'admin' || password === 'test') {
        req.session.isAdmin = true;
        console.log('Login successful, session set, redirecting to /admin');
        res.redirect('/admin');
    } else {
        res.render('admin/login', { error: 'Invalid password', firstTime: false });
    }
});

app.get('/admin/', requireAuth, (req, res) => {
    res.redirect('/admin');
});

app.get('/admin', requireAuth, (req, res) => {
    console.log('Admin dashboard route accessed');
    res.render('admin/dashboard', { 
        notes: [],
        activeNotesCount: 0,
        error: null
    });
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Catch-all for other admin routes
app.get('/admin/*', (req, res) => {
    console.log('Admin route catch-all hit:', req.path);
    res.status(404).json({ error: 'Admin page not found', path: req.path });
});

// Basic note routes
app.get('/', (req, res) => {
    res.redirect('/new');
});

app.get('/new', (req, res) => {
    const uniqueUrl = Math.random().toString(36).substring(2, 15);
    res.redirect(`/${uniqueUrl}`);
});

app.get('/:url', (req, res) => {
    if (req.params.url === 'admin' || req.params.url.startsWith('admin/')) {
        return res.status(404).json({ error: 'Not found', url: req.params.url });
    }
    
    // Mock note rendering
    res.send(`
        <h1>Note: ${req.params.url}</h1>
        <p>This is a test note.</p>
        <a href="/admin/login">Admin Login</a>
    `);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Test server started on port ${PORT}`);
    console.log(`Access admin at: http://localhost:${PORT}/admin/login`);
    console.log(`Test password: admin or test`);
});
