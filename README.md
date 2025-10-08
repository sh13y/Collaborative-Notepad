
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
# 🚀 Collaborative Notepad: Real-Time Notes for Everyone

[![Star this repo](https://img.shields.io/github/stars/sh13y/collaborative-notepad?style=social)](https://github.com/sh13y/collaborative-notepad/stargazers)

> **Like this project?** [Star it on GitHub!](https://github.com/sh13y/collaborative-notepad) ⭐ &nbsp; | &nbsp; [Share on Twitter](https://twitter.com/intent/tweet?text=Check%20out%20Collaborative%20Notepad%20by%20%40sh13y%20for%20real-time%20note%20collaboration!%20https%3A%2F%2Fgithub.com%2Fsh13y%2Fcollaborative-notepad) &nbsp; | &nbsp; [Live Demo](https://collabnote.link/)

**Collaborative Notepad** is a free, open-source, real-time notepad for teams, friends, and classrooms. Create, share, and edit notes instantly—no sign-up required. Perfect for brainstorming, meetings, study groups, and more!

---

> "The best ideas come from collaboration, water, and probably a bit of back pain." - Me, after my 20-hour coding marathon

Welcome to my pride and joy - a real-time collaborative notepad that's more fun than trying to teach your grandma how to Zoom! 

## 🎯 Version 2.0.0 Updates

### 🔒 Enhanced Security & Admin Features
- **Secret Admin Panel** - Hidden admin path for maximum security (configurable via .env)
- **Password-Protected Dashboard** - Secure bcrypt hashing with session management
- **Admin Content Management** - View, monitor, and manage all notes from admin dashboard
- **Empty Notes Cleanup** - Manual and automatic removal of empty/unused notes
- **Suspicious Request Monitoring** - Logs potential security threats in production
- **Enhanced Content Security Policy** - Prevents XSS and injection attacks
- **Professional Error Handling** - User-friendly 404/500 pages with helpful actions

### 🤖 Automated Maintenance
- **Scheduled Cleanup Service** - Automatically removes empty notes older than 7 days
- **Real-time Cleanup Stats** - Dashboard shows old vs recent empty notes breakdown
- **Manual Cleanup Controls** - Admin buttons for immediate empty note removal
- **Bot Protection** - Prevents automated systems from creating blank notes
- **Health Check Endpoint** - `/health` for monitoring and uptime checks

### 🛡️ Production-Ready Security
- **Rate Limiting** - Protects against abuse and spam
- **Security Headers** - X-Frame-Options, X-XSS-Protection, HSTS, etc.
- **Request Pattern Detection** - Identifies common attack vectors
- **SEO Control** - robots.txt prevents admin path indexing
- **Security.txt** - Responsible disclosure contact information
- **Hidden Server Information** - Removes identifying headers

### 🎨 Enhanced User Experience
- **Improved Error Pages** - Professional design with helpful navigation
- **Auto-Redirect** - Smart redirects from error pages to useful destinations
- **Better Mobile Support** - Fully responsive on all devices
- **Status Code Display** - Clear error identification (404, 500, etc.)
- **Development Mode** - Enhanced debugging for developers

### 📊 Advanced Analytics & Monitoring
- **Real-time Dashboard Stats** - Live updates of active, total, and empty notes
- **Socket.IO Connection Monitoring** - Track real-time user connections
- **Cleanup Activity Logging** - Monitor automated maintenance operations
- **Production Logging** - Security event tracking and suspicious activity alerts

## 👀 Look at This Beauty!

![Collaborative Notepad Screenshot](assets/screenshot.png)

*Yes, it actually looks this good. No, I didn't use filters!*

## 🎭 The Drama Behind the Project

After 20 hours of relentless coding, countless water refills, one serious back pain (desperately need a chair 🪑), and an existential crisis later, this beauty finally went live! Why? Because I believe sharing notes shouldn't be harder than explaining to yourself why you didn't invest in a proper chair before this coding marathon.

## 🌟 Features That Make Me Stand Up (Because Sitting Hurts)

### 🚀 Core Collaboration Features
- **Real-time Collaboration** - Watch your friends type in real-time (while you do some stretching)
- **Custom URLs** - Create memorable links like "my-back-is-killing-me"
- **Dark Mode** - For vampires, developers, and people who've lost track of day and night
- **User Counter** - See how many people are enjoying this while you can't even sit properly
- **Responsive Design** - Works on everything from your fancy iPhone to that potato you call a laptop
- **Auto-Save** - Because we all have trust issues after that one time we lost our work

### 🔒 Security & Admin Features
- **Secret Admin Panel** - Hidden admin URLs for maximum security (bye-bye `/admin`)
- **Password Protection** - Secure admin login with bcrypt hashing and session management
- **Real-time Monitoring** - Live tracking of active notes, users, and system health
- **Content Management** - View all notes with previews, timestamps, and cleanup controls
- **Suspicious Activity Monitoring** - Logs potential security threats automatically
- **Bot Protection** - Prevents automated blank note creation
- **Rate Limiting** - Protects against spam and abuse

### 🤖 Automated Maintenance
- **Scheduled Cleanup** - Automatically removes empty notes older than 7 days (daily at 2 AM UTC)
- **Manual Cleanup Controls** - Admin dashboard buttons for immediate empty note removal
- **Cleanup Statistics** - Real-time breakdown of old vs recent empty notes
- **Health Check Endpoint** - `/health` for monitoring system status
- **Production Logging** - Comprehensive security and maintenance event tracking

### 🛡️ Error Handling & User Experience
- **Professional Error Pages** - Friendly 404/500 pages with helpful navigation options
- **Auto-Redirect** - Smart redirects from error pages to useful destinations
- **Status Code Display** - Clear error identification and technical details (dev mode)
- **SEO Controls** - robots.txt, sitemap.xml, and security.txt for proper web standards
- **Mobile Optimization** - Fully responsive design for all device types

### 🔧 Developer Features
- **Environment Configuration** - Comprehensive .env setup with security options
- **Development Mode** - Enhanced debugging and error details
- **Security Headers** - CSP, HSTS, X-Frame-Options, and more
- **Request Monitoring** - Pattern detection for common attack vectors
- **Socket.IO Optimization** - Efficient real-time connection management

### ⚡ Performance Optimizations
- **Database Batching** - Intelligent write buffering reduces DB load by ~95%
- **In-Memory State Management** - Real-time edits cached locally for instant collaboration
- **Batch Processing** - Periodic 5-second database commits instead of per-keystroke writes
- **Concurrent Updates** - Promise.all() batch processing for optimal database performance
- **Smart Cleanup** - Automatic removal of empty notes from memory buffer

## 🛠️ Tech Stack (The Cool Kids Club)

### 🖥️ Backend Powerhouse
- **Node.js** - Because JavaScript everywhere!
- **Express.js** - The backend framework that makes everything express(ly) better
- **Socket.IO** - Real-time magic ✨
- **MongoDB & Mongoose** - Where your notes go to live forever
- **bcrypt** - Keeping admin passwords safe and sound
- **express-session & connect-mongo** - Managing admin sessions like a boss

### 🔒 Security Arsenal
- **Helmet** - Security headers and CSP protection
- **express-rate-limit** - Spam protection that actually works
- **dotenv** - Environment variable management
- **CORS & Security Headers** - Keeping the bad guys out

### 🤖 Automation & Maintenance
- **node-cron** - Scheduled cleanup tasks (because automation is life)
- **Compression** - Making your app faster than your morning coffee
- **Body-parser** - Handling requests like a diplomatic ninja

### 🎨 Frontend Magic
- **EJS** - Templates that don't make you cry
- **CSS3 & Modern JavaScript** - Making things pretty since... well, since I learned CSS
- **Socket.IO Client** - Real-time frontend updates
- **Responsive Design** - Mobile-first, coffee-second

### 🚀 Production Ready
- **Environment Configuration** - Development vs Production optimization
- **Error Handling Middleware** - Graceful error management
- **Logging & Monitoring** - Track everything, debug with confidence
- **SEO Optimization** - robots.txt, sitemap.xml, security.txt

## 🏃‍♂️ Quick Start (Even Your Cat Could Do It)

```bash
# Clone this beauty
git clone https://github.com/sh13y/collaborative-notepad.git

# Enter the matrix
cd collaborative-notepad

# Install dependencies (grab some water, this might take a while)
npm install

# Set up your environment
cp .env.example .env
# Edit .env with your configuration:
# - MONGODB_URI: Your MongoDB connection string
# - SESSION_SECRET: Strong secret for session security  
# - ADMIN_SECRET_PATH: Custom secret path for admin panel
# - PORT: Server port (defaults to 3000)
# - NODE_ENV: Set to 'production' for enhanced security

# Start the magic
npm start

# Visit http://localhost:3000 and prepare to be amazed
```

## 🌍 Deployment Options

### 1. Render (Recommended)
```bash
# Just push to GitHub and connect with Render
# Set environment variables in Render dashboard:
- MONGODB_URI=your_mongodb_uri
- SESSION_SECRET=your-super-secret-session-key
- ADMIN_SECRET_PATH=your-custom-admin-path
- NODE_ENV=production
- PORT=3000
```

### 2. Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### 3. Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy
```

## 🎮 How to Use (For Humans and AI Alike)

### 📝 Basic Usage
1. Visit the deployed URL
2. Start typing like you're writing the next great novel
3. Share the URL with friends (yes, you need friends for this part)
4. Watch the magic happen in real-time
5. Toggle dark mode when you're feeling mysterious
6. Create custom URLs for your notes

### 🔒 Admin Features (For The Chosen Ones)
7. Access your secret admin panel at `/your-secret-path` (configured in .env)
8. Monitor your notepad empire from the admin dashboard
9. Use cleanup controls to maintain a tidy database
10. Monitor real-time stats and user activity

### 🛡️ Error Handling & Security
11. Enjoy professional error pages when things go wrong
12. Benefit from automatic bot protection and rate limiting
13. Rest easy knowing your admin panel is hidden and secure
14. Let the automated cleanup keep your database optimized

*Pro tip: Bookmark your secret admin URL privately - it's your kingdom, after all!*

## 🔒 Admin Security & Access

**Important: The admin panel is now secured with a hidden path for enhanced security!**

### 🛡️ Secure Admin Setup

By default, the admin panel is **NOT** accessible at `/admin` for security reasons. Instead, it uses a secret path that only you know:

**Default Admin URLs:**
- **Login**: `https://yourdomain.com/my-super-secret-admin-2024-x9k3m7/login`
- **Dashboard**: `https://yourdomain.com/my-super-secret-admin-2024-x9k3m7`

### 🔧 Customizing Your Secret Admin Path

1. **Set your custom secret path** in `.env`:
```bash
ADMIN_SECRET_PATH=your-custom-secret-path-here
```

2. **Your admin URLs become:**
```
https://yourdomain.com/your-custom-secret-path-here/login
https://yourdomain.com/your-custom-secret-path-here
```

### 🎯 Security Features

- ✅ **Hidden Admin Panel**: Only accessible via secret URL
- ✅ **404 for `/admin`**: Anyone trying `/admin` gets "Page not found"
- ✅ **No Discovery**: No hints that an admin panel exists
- ✅ **Password Protected**: Secure bcrypt password hashing
- ✅ **Session Management**: Secure admin sessions
- ✅ **Environment Variable**: Easy to change secret path anytime

### 🔑 First-Time Admin Setup

1. Visit your secret admin login URL
2. Enter your desired admin password (first visit creates the admin account)
3. You'll be automatically logged in to the dashboard
4. **Bookmark your secret URL privately!**

### 🛠️ Admin Dashboard Features

- **Real-time Stats**: Live count of active notes and users
- **Note Management**: View all notes with content previews
- **Security Controls**: Reset admin password, secure logout
- **Live Updates**: Real-time monitoring via WebSocket

### 🔄 Changing Your Secret Path

```bash
# In your .env file
ADMIN_SECRET_PATH=my-new-super-secret-path-2024

# Redeploy your application
# New admin URL: https://yourdomain.com/my-new-super-secret-path-2024/login
```

**Pro Tips:**
- Use a complex path with letters, numbers, and hyphens
- Keep your admin URL private and secure
- Change the secret path periodically for extra security
- Never share your admin URL publicly

## 🚀 API Endpoints & Monitoring

### 🔍 Public Endpoints
- `GET /health` - Health check endpoint for monitoring services
- `GET /robots.txt` - SEO control and admin path protection
- `GET /sitemap.xml` - Search engine optimization
- `GET /security.txt` - Responsible disclosure information

### 🔒 Admin Endpoints (Hidden Behind Secret Path)
- `GET /{secret-path}/login` - Admin login page
- `GET /{secret-path}` - Admin dashboard with real-time stats
- `POST /{secret-path}/delete-empty-notes` - Manual cleanup trigger
- `POST /{secret-path}/cleanup-old-empty-notes` - Remove notes older than 7 days
- `GET /{secret-path}/cleanup-stats` - Real-time cleanup statistics
- `POST /{secret-path}/reset-password` - Reset admin password
- `GET /{secret-path}/logout` - Secure admin logout

### 📊 Real-time Features
- **Socket.IO Events** - Live collaboration and admin statistics
- **Automatic Cleanup** - Daily job runs at 2:00 AM UTC
- **Security Monitoring** - Suspicious request pattern detection
- **Rate Limiting** - Configurable request limits per IP

---

## 🎯 **Feature Roadmap & Checklist**

*Because there's nothing more satisfying than checking off completed features! ✅*

### 🔥 **Current Features (Already Implemented)**
- [x] **Real-time Collaboration** - Multiple users can edit simultaneously
- [x] **User Presence Indicators** - Live user count with visual status dots
- [x] **Custom URLs** - Create memorable note links
- [x] **Dark/Light Mode** - Theme switching with persistence
- [x] **Admin Dashboard** - Hidden admin panel with real-time stats
- [x] **Auto-Save** - Real-time content synchronization
- [x] **Scheduled Cleanup** - Automatic empty note removal (7+ days)
- [x] **Security Features** - Rate limiting, CSP, request monitoring
- [x] **Error Handling** - Professional 404/500 pages
- [x] **Mobile Responsive** - Works on all devices
- [x] **Bot Protection** - Prevents automated note creation
- [x] **Health Monitoring** - `/health` endpoint for uptime checks

### 🚀 **Next Level Features (Ready to Implement)**

#### 📝 **Enhanced Editor Experience**
- [ ] **Rich Text Editor** - Markdown support with live preview
- [ ] **Syntax Highlighting** - Code block formatting
- [ ] **Text Formatting Toolbar** - Bold, italic, lists, headers
- [ ] **Collaborative Cursors** - See where others are typing
- [ ] **Undo/Redo System** - With collaborative conflict resolution
- [ ] **Word Count & Stats** - Character count, reading time
- [ ] **Auto-Complete** - Smart text suggestions

#### 🕒 **Version Control & History**
- [ ] **Note Version History** - Track all changes with timestamps
- [ ] **Restore Previous Versions** - Time-travel through edits
- [ ] **Version Comparison** - Side-by-side diff view
- [ ] **Edit Activity Timeline** - Visual edit history
- [ ] **Auto-Version Creation** - Save versions every 30 seconds
- [ ] **Export Version History** - Download edit timeline

#### 🔒 **Advanced Security & Privacy**
- [ ] **Password-Protected Notes** - Private note encryption
- [ ] **Note Expiration Dates** - Auto-delete after X time
- [ ] **IP-Based Access Control** - Restrict note access by location
- [ ] **Two-Factor Admin Auth** - Enhanced admin security
- [ ] **Note Encryption at Rest** - Database-level encryption
- [ ] **Audit Logging** - Comprehensive activity tracking
- [ ] **GDPR Compliance Tools** - Data export/deletion features

#### 📱 **Mobile & PWA Experience**
- [ ] **Progressive Web App** - Install like a native app
- [ ] **Offline Editing** - Work without internet connection
- [ ] **Push Notifications** - Notify collaborators of changes
- [ ] **Background Sync** - Sync when connection returns
- [ ] **Mobile Optimized UI** - Touch-friendly interface
- [ ] **Swipe Gestures** - Mobile navigation enhancements

#### 📊 **Analytics & Insights**
- [ ] **Usage Analytics Dashboard** - Note creation trends
- [ ] **Geographic User Distribution** - IP-based location insights
- [ ] **Peak Usage Time Analysis** - Traffic pattern insights
- [ ] **Most Popular Notes** - Trending content tracking
- [ ] **User Engagement Metrics** - Time spent, edit frequency
- [ ] **Admin Analytics Charts** - Visual data representation
- [ ] **Export Analytics Data** - CSV/JSON data exports

#### 🌐 **Integration & Import/Export**
- [ ] **Export to PDF** - Professional document generation
- [ ] **Export to Word/Markdown** - Multiple format support
- [ ] **Import from Google Docs** - Migrate existing documents
- [ ] **Webhook Notifications** - External system integration
- [ ] **REST API** - Third-party app integration
- [ ] **Slack/Discord Bots** - Team chat integration
- [ ] **Email Notifications** - Collaboration alerts

#### 🎨 **UI/UX Enhancements**
- [ ] **Customizable Themes** - User-created color schemes
- [ ] **Font Selection** - Multiple typography options
- [ ] **Split-Screen Mode** - Side-by-side editing/preview
- [ ] **Document Minimap** - Navigation for long notes
- [ ] **Focus Mode** - Distraction-free writing
- [ ] **Typewriter Mode** - Center current line
- [ ] **Full-Screen Editing** - Immersive writing experience

#### 🔍 **Search & Organization**
- [ ] **Global Note Search** - Search across all public notes
- [ ] **Advanced Search Filters** - Date, author, content type
- [ ] **Note Categories/Tags** - Organize and filter notes
- [ ] **Recently Viewed Notes** - Quick access to recent work
- [ ] **Bookmark System** - Save favorite notes
- [ ] **Note Templates** - Pre-formatted note types
- [ ] **Duplicate Note Detection** - Prevent content redundancy

#### 🌍 **Internationalization & Accessibility**
- [ ] **Multi-Language Support** - i18n implementation
- [ ] **RTL Language Support** - Arabic, Hebrew text direction
- [ ] **Screen Reader Compatibility** - ARIA labels and structure
- [ ] **Keyboard Navigation** - Full app control via keyboard
- [ ] **High Contrast Mode** - Accessibility-focused themes
- [ ] **Font Size Controls** - User-adjustable text sizing
- [ ] **Voice Input Support** - Speech-to-text integration

#### ⚡ **Performance & Scalability**
- [ ] **Redis Caching** - Faster data retrieval
- [ ] **CDN Integration** - Global content delivery
- [ ] **Database Indexing** - Optimized query performance
- [ ] **Load Balancing** - Handle increased traffic
- [ ] **Real-time Presence Scaling** - Support more concurrent users
- [ ] **Compression Optimization** - Smaller data transfers
- [ ] **Lazy Loading** - Faster initial page loads

#### 🤖 **AI-Powered Features**
- [ ] **Smart Auto-Save Conflicts** - AI-powered merge resolution
- [ ] **Content Suggestions** - AI writing assistance
- [ ] **Auto-Categorization** - ML-based note classification
- [ ] **Duplicate Content Detection** - AI similarity analysis
- [ ] **Language Translation** - Real-time note translation
- [ ] **Grammar & Spell Check** - Integrated writing assistance
- [ ] **Smart Note Titles** - AI-generated title suggestions

### 🎯 **Implementation Priority Recommendations**

**Phase 1 (Quick Wins - 1-2 weeks):**
1. ✅ Rich Text Editor with Markdown
2. ✅ Note Version History
3. ✅ PWA Setup with Offline Support
4. ✅ Enhanced Analytics Dashboard

**Phase 2 (Major Features - 2-4 weeks):**
1. ✅ Password-Protected Notes
2. ✅ Import/Export Functionality
3. ✅ Advanced Search & Organization
4. ✅ Mobile UI Enhancements

**Phase 3 (Advanced Features - 1-2 months):**
1. ✅ AI-Powered Features
2. ✅ Multi-language Support
3. ✅ Enterprise Security Features
4. ✅ Performance Optimization

---

*Ready to start ticking these off? Just let me know which feature catches your eye and I'll implement it! 🚀*

## 🤔 Why This Project Exists

Because Google Docs is too mainstream, and passing notes in class is so last century. Also, I spent way too much time building this to not show it off.

## 🤖 Automated Maintenance & Cleanup

Your Collaborative Notepad now comes with a built-in janitor service (no, seriously!):

### 🕐 Scheduled Cleanup (Daily at 2:00 AM UTC)
- **Automatic Empty Note Removal** - Cleans up notes older than 7 days with no content
- **Database Optimization** - Keeps your MongoDB lean and mean
- **Zero Maintenance Required** - Set it and forget it (unlike my posture)

### 🛠️ Admin Controls
- **Manual Cleanup** - "Delete Empty Notes" button for immediate spring cleaning
- **Cleanup Statistics** - See breakdown of old vs recent empty notes
- **Real-time Monitoring** - Watch your database stay squeaky clean

### 🔍 Health Monitoring
- **Health Check Endpoint** - `/health` returns server status
- **Production Logging** - Security events and maintenance activities
- **Bot Detection** - Prevents automated systems from cluttering your notes

*Because nobody wants a messy database, especially after spending 20 hours building it!*

## 🐛 Found a Bug?

First, try turning it off and on again. If that doesn't work:
1. Check if Mercury is in retrograde
2. Make sure your computer isn't possessed
3. [Open an issue](https://github.com/sh13y/collaborative-notepad/issues)
4. Or better yet, fix it and submit a PR!

## 🌟 Contributors

Special thanks to these amazing contributors who made this project better:

### 🚀 Performance & Architecture
- **[@mdrehan369](https://github.com/mdrehan369)** - Implemented intelligent database batching system, reducing database load by ~95% and solving the core performance bottleneck. A true optimization wizard! 🎯

### 🎨 UI/UX Improvements  
- **[@D4rk-Pho3nix](https://github.com/D4rk-Pho3nix)** - Working on collaborative cursor indicators for enhanced real-time presence awareness 🎯

- **[@Radhika-dodain](https://github.com/Radhika-dodain)** - Adding text formatting options (bold, italic, underline, highlight) to enhance the editing experience ✨

- **[@almostcoderr](https://github.com/almostcoderr)** - Exploring additional dark mode enhancements and theme improvements 🌙

*Want to see your name here? Check out our [Contributing Guide](CONTRIBUTING.md) and join the fun! All skill levels welcome! 🚀*

## 💝 Support My Chair Fund

If this project has saved you from the horrors of email attachments or helped you procrastinate effectively, consider:
- [Back Pain Relief Fund 🪑🤕](http://paypal.me/shieyz) (Seriously, 20 hours of coding on a bad chair is NOT fun)
- Starring this repo (it's free and makes the pain slightly more bearable)
- Telling your developer friends to maintain good posture (we all need this reminder)

## 📜 License

MIT Licensed - Which means you can do whatever you want with it, just don't blame me if your cat accidentally deletes your notes by walking on the keyboard!

---

Engineered with ❤️ from the floor, debugged with 💪, powered by 💧, and brought to you by [sh13y](https://github.com/sh13y) – the developer who turned back pain into a feature, not a bug 🪑✨

P.S. If you've read this far, you deserve a cookie 🍪 and probably need a hobby (and a better chair than mine).

P.P.S. Yes, this README took longer to write than some of the actual features, mostly because I had to keep standing up to stretch.

## Deployment Adventure

After 20 hours of relentless patience, debugging, and sheer determination (not to mention a lot of water and back stretches), **Collaborative Notepad** is finally live on the [internet](https://collabnote.link/)! Who knew that the journey from `npm start` to "deployment success" could feel like a chiropractor's waiting list? 😅

Take a moment to appreciate the beauty of the internet: it took 20 hours and my spine... but hey, better late than never, right?

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://mdrehandeveloper.xyz"><img src="https://avatars.githubusercontent.com/u/121730065?v=4?s=100" width="100px;" alt="MD Rehan"/><br /><sub><b>MD Rehan</b></sub></a><br /><a href="https://github.com/sh13y/Collaborative-Notepad/commits?author=mdrehan369" title="Code">💻</a> <a href="#ideas-mdrehan369" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/sh13y/Collaborative-Notepad/issues?q=author%3Amdrehan369" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Dipanjana25"><img src="https://avatars.githubusercontent.com/u/95460551?v=4?s=100" width="100px;" alt="Dipanjana Dasgupta"/><br /><sub><b>Dipanjana Dasgupta</b></sub></a><br /><a href="https://github.com/sh13y/Collaborative-Notepad/commits?author=Dipanjana25" title="Code">💻</a> <a href="https://github.com/sh13y/Collaborative-Notepad/issues?q=author%3ADipanjana25" title="Bug reports">🐛</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!