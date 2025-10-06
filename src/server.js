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

console.log('🚀 Starting Collaborative Notepad...');
console.log('📂 Loading dependencies...');

// Import custom modules
const connectDB = require('./config/database');
const noteRoutes = require('./routes/noteRoutes');
const setupSocket = require('./utils/socketHandler');
const adminRoutes = require('./routes/adminRoutes');
const cleanupService = require('./utils/cleanupService');

console.log('✅ Dependencies loaded');
console.log('🔧 Initializing Express app...');

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
      manifestSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrcAttr: ["'none'"]
    },
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  originAgentCluster: true,
  referrerPolicy: { policy: "no-referrer" },
  strictTransportSecurity: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'deny' }
}));

// Additional security headers and monitoring
app.use((req, res, next) => {
  // Hide server information
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Security monitoring in production
  if (process.env.NODE_ENV === 'production') {
    // Log suspicious patterns
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /script/i,  // Script injection
      /union.*select/i,  // SQL injection
      /admin|wp-admin|phpmyadmin/i,  // Admin panel scanning
      /\.php|\.asp|\.jsp/i,  // File extension scanning
      /eval\(|javascript:/i  // Code injection
    ];

    const isSuspicious = suspiciousPatterns.some(pattern =>
      pattern.test(req.url) || pattern.test(req.get('User-Agent') || '')
    );

    if (isSuspicious) {
      console.warn(`🚨 Suspicious request: ${req.method} ${req.url} from ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
    }
  }

  next();
});

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
  store: process.env.MONGODB_URI ? MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // Session TTL in seconds (1 day)
  }) : undefined, // Fallback to memory store if no MongoDB
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  },
  name: 'sessionId', // Custom cookie name
  proxy: process.env.NODE_ENV === 'production' // Trust the reverse proxy in production
}));

// Add this before your routes
app.set('trust proxy', 1); // Trust first proxy

// Routes - Admin routes should come first to avoid conflicts
app.use('/', adminRoutes);
app.use('/', noteRoutes);

// 404 Error Handler - Must come after all routes
app.use('*', (req, res, next) => {
  // Log suspicious requests for security monitoring
  if (process.env.NODE_ENV === 'production') {
    console.log(`404 - Unknown route accessed: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
  }

  // Check if it's an API request (JSON expected)
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found',
      status: 404
    });
  }

  // For HTML requests, render the not-found page
  res.status(404).render('not-found', {
    message: 'Page not found',
    redirectUrl: '/new',
    statusCode: 404
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Log the error for debugging
  console.error('Global error handler:', err);

  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Determine error status code
  const statusCode = err.status || err.statusCode || 500;

  // Log security-relevant errors
  if (statusCode === 403 || statusCode === 401) {
    console.warn(`Security event - ${statusCode}: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
  }

  // Check if it's an API request
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'Internal Server Error' : err.message || 'An error occurred',
      message: isDevelopment ? err.stack : 'Something went wrong',
      status: statusCode
    });
  }

  // For HTML requests, render error page
  res.status(statusCode).render('not-found', {
    message: statusCode >= 500 ? 'Internal server error' : 'An error occurred',
    redirectUrl: '/new',
    statusCode: statusCode,
    error: isDevelopment ? err.stack : null
  });
});

// Setup WebSocket
setupSocket.setupSocket(io);

setupSocket.addNotesToDatabase()
// Start automatic cleanup service
cleanupService.start();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));

module.exports = app; 
