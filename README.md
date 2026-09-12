<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-3-orange.svg?style=flat-square)](#-contributors)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

# 🚀 Collaborative Notepad

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg?style=flat-square)](https://github.com/sh13y/collaborative-notepad/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Star this repo](https://img.shields.io/github/stars/sh13y/collaborative-notepad?style=social)](https://github.com/sh13y/collaborative-notepad/stargazers)

**A free, open-source real-time collaborative notepad. No sign-up. No friction. Just paste a link and start writing together.**

[🌐 Live Demo](https://collabnote.link/) &nbsp;|&nbsp; [📋 Roadmap](ROADMAP.md) &nbsp;|&nbsp; [🤝 Contributing](CONTRIBUTING.md) &nbsp;|&nbsp; [🐛 Report a Bug](https://github.com/sh13y/collaborative-notepad/issues)

---

## 📖 The Story

> *"The best ideas come from collaboration, water, and probably a bit of back pain."*
> — Me, after my 20-hour coding marathon

Welcome to my pride and joy — a real-time collaborative notepad that's more fun than trying to teach your grandma how to Zoom!

After 20 hours of relentless coding, countless water refills, one serious back pain episode (desperately need a chair 🪑), and an existential crisis later, this beauty finally went live. Why? Because I believe sharing notes shouldn't be harder than explaining to yourself why you didn't invest in a proper chair before a coding marathon.

The deployment journey — from `npm start` to "success" — felt like a chiropractor's waiting list. But hey, better late than never.

---

## ✨ Features

### 🚀 Core Collaboration
- **Real-time editing** — watch your friends type live (while you do some stretching)
- **Custom URLs** — create memorable links like `my-back-is-killing-me`
- **Dark / Light mode** — for vampires, developers, and people who've lost track of day and night
- **User presence counter** — see how many people are enjoying this
- **Auto-save** — because we all have trust issues after losing work that one time
- **Responsive design** — works on everything from your fancy phone to that potato you call a laptop

### 🔒 Security & Admin
- **Secret admin panel** — hidden URL for your eyes only (no `/admin` guessing)
- **bcrypt password protection** — secure admin login with session management
- **Real-time monitoring** — live stats on active notes, users, and system health
- **Note content management** — view all notes with previews, timestamps, and cleanup controls
- **Bot protection** — prevents automated blank note creation
- **Rate limiting** — protects against spam and abuse
- **Suspicious activity monitoring** — logs potential security threats automatically

### 🤖 Automated Maintenance
- **Scheduled cleanup** — auto-removes empty notes older than 7 days (daily at 2:00 AM UTC)
- **Manual cleanup controls** — admin dashboard buttons for immediate spring cleaning
- **Cleanup statistics** — real-time breakdown of old vs recent empty notes
- **Health check endpoint** — `/health` for uptime monitoring

### ⚡ Performance
- **Database write batching** — reduces DB load by ~95% vs per-keystroke writes
- **In-memory state management** — real-time edits cached locally for instant sync
- **5-second batch commits** — periodic database writes instead of hammering on every keystroke
- **Promise.all() batch processing** — optimal concurrent database performance

### 🛡️ Production-Ready
- **Security headers** — Helmet, CSP, HSTS, X-Frame-Options, X-XSS-Protection
- **Professional error pages** — friendly 404/500 pages with navigation options
- **SEO controls** — robots.txt, sitemap.xml, security.txt
- **Environment-based config** — development vs production behavior

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 20.x |
| **Framework** | Express.js |
| **Real-time** | Socket.IO |
| **Database** | MongoDB + Mongoose |
| **Templating** | EJS |
| **Auth** | bcrypt + express-session + connect-mongo |
| **Security** | Helmet + express-rate-limit + dotenv |
| **Scheduling** | node-cron |
| **Compression** | compression |

---

## 🏃 Quick Start

```bash
# Clone the repo
git clone https://github.com/sh13y/collaborative-notepad.git
cd collaborative-notepad

# Install dependencies (grab some water, this might take a moment)
npm install

# Set up environment variables
cp .env.example .env
```

Edit your `.env` file:

```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=a-long-random-secret-string
ADMIN_SECRET_PATH=your-custom-secret-admin-path
PORT=3000
NODE_ENV=development
```

```bash
# Fire it up
npm start

# Or with auto-reload for development
npm run dev
```

Visit `http://localhost:3000` and prepare to be amazed.

---

## 🌍 Deployment

### Render (Recommended)
1. Push to GitHub and connect your repo to [Render](https://render.com)
2. Set environment variables in the Render dashboard:
   ```
   MONGODB_URI, SESSION_SECRET, ADMIN_SECRET_PATH, NODE_ENV=production, PORT=3000
   ```
3. Done — Render handles the rest

### Vercel
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy
```

---

## 🔒 Admin Panel

The admin panel is **not** at `/admin`. It uses a secret path that only you know — so brute-forcing the URL gives you nothing.

**Default URLs:**
```
https://yourdomain.com/{ADMIN_SECRET_PATH}/login
https://yourdomain.com/{ADMIN_SECRET_PATH}
```

**First-time setup:**
1. Visit your secret login URL
2. Enter a password — this creates your admin account
3. Bookmark the URL privately — it's your kingdom 👑

**Dashboard includes:**
- Live stats: active notes, total notes, connected users
- Note management: view content previews and timestamps
- Cleanup controls: delete empty notes manually or on schedule
- Security: reset password, secure logout

**Changing your secret path:**
```bash
# In .env
ADMIN_SECRET_PATH=my-new-secret-path-2025

# Redeploy — new URL takes effect immediately
```

> 💡 Use a complex path with letters, numbers, and hyphens. Change it periodically. Never share it.

---

## 📡 API Reference

### Public Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server health check |
| `GET` | `/robots.txt` | SEO crawler control |
| `GET` | `/sitemap.xml` | Search engine sitemap |
| `GET` | `/security.txt` | Responsible disclosure info |

### Admin Endpoints (Behind Secret Path)

| Method | Path | Description |
|---|---|---|
| `GET` | `/{secret}/login` | Admin login page |
| `GET` | `/{secret}` | Admin dashboard |
| `POST` | `/{secret}/delete-empty-notes` | Manual cleanup trigger |
| `POST` | `/{secret}/cleanup-old-empty-notes` | Remove notes older than 7 days |
| `GET` | `/{secret}/cleanup-stats` | Real-time cleanup statistics |
| `POST` | `/{secret}/reset-password` | Reset admin password |
| `GET` | `/{secret}/logout` | Secure logout |

---

## 🤝 Contributing

All skill levels welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

Quick version:
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
# make your changes
git commit -m "Add: brief description"
git push origin feature/your-feature-name
# open a PR targeting main
```

Check the [Roadmap](ROADMAP.md) for ideas on what to build next.

---

## 👥 Contributors

Thanks to everyone who made this better:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://mdrehandeveloper.xyz"><img src="https://avatars.githubusercontent.com/u/121730065?v=4?s=100" width="100px;" alt="MD Rehan"/><br /><sub><b>MD Rehan</b></sub></a><br /><a href="https://github.com/sh13y/Collaborative-Notepad/commits?author=mdrehan369" title="Code">💻</a> <a href="#ideas-mdrehan369" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/sh13y/Collaborative-Notepad/issues?q=author%3Amdrehan369" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/saifxyzyz"><img src="https://avatars.githubusercontent.com/u/114160449?v=4?s=100" width="100px;" alt="Mohammed Saif"/><br /><sub><b>Mohammed Saif</b></sub></a><br /><a href="https://github.com/sh13y/Collaborative-Notepad/commits?author=saifxyzyz" title="Code">💻</a> <a href="#design-saifxyzyz" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Dipanjana25"><img src="https://avatars.githubusercontent.com/u/95460551?v=4?s=100" width="100px;" alt="Dipanjana Dasgupta"/><br /><sub><b>Dipanjana Dasgupta</b></sub></a><br /><a href="https://github.com/sh13y/Collaborative-Notepad/commits?author=Dipanjana25" title="Code">💻</a> <a href="https://github.com/sh13y/Collaborative-Notepad/issues?q=author%3ADipanjana25" title="Bug reports">🐛</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

*Want to see your name here? Check out [CONTRIBUTING.md](CONTRIBUTING.md) and join the fun! 🚀*

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification.

---

## 🐛 Found a Bug?

First, try turning it off and on again. If that doesn't work:
1. Check if Mercury is in retrograde
2. Make sure your computer isn't possessed
3. [Open an issue](https://github.com/sh13y/collaborative-notepad/issues)
4. Or better yet — fix it and send a PR!

---

## 💝 Support the Chair Fund

If this project saved you from the horrors of email attachments or helped you procrastinate productively, consider:

- [🪑 Back Pain Relief Fund](http://paypal.me/shieyz) — seriously, 20 hours of coding on a bad chair is NOT fun
- ⭐ Starring this repo — it's free and makes the pain slightly more bearable
- Telling your developer friends to maintain good posture (we all need this reminder)

---

## 📜 License

MIT — which means you can do whatever you want with it, just don't blame me if your cat deletes your notes by walking on the keyboard.

---

*Engineered with ❤️ from the floor, debugged with 💪, powered by 💧, and brought to you by [sh13y](https://github.com/sh13y) — the developer who turned back pain into a feature, not a bug 🪑✨*

*P.S. If you've read this far, you deserve a cookie 🍪 and probably need a hobby (and a better chair than mine).*

*P.P.S. Yes, this README took longer to write than some of the actual features — mostly because I had to keep standing up to stretch.*