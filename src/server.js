const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

// Import custom modules
const connectDB = require('./config/database');
const noteRoutes = require('./routes/noteRoutes');
const setupSocket = require('./utils/socketHandler');
const adminRoutes = require('./routes/adminRoutes');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Add compression and security middleware
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "wss:", "ws:", "https:", "*"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https:", "cdn.socket.io", "www.googletagmanager.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:", "fonts.googleapis.com", "cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "cdnjs.cloudflare.com"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'", "blob:"],
            frameSrc: ["'self'"],
            manifestSrc: ["'self'"]
        },
    },
}));

// Cache static assets
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1y',
    etag: true,
    lastModified: true
}));

// Initialize Socket.IO with optimized settings
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    allowUpgrades: true,
    cookie: false
});

// Make io available app-wide
app.set('io', io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Add session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Routes
app.use('/', noteRoutes);
app.use('/', adminRoutes);

// Setup WebSocket
setupSocket(io);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

module.exports = app; 