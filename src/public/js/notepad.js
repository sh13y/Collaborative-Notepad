/**
 * Collaborative Notepad - Real-time client script
 * Handles WebSocket synchronization, collaborative cursors, presence, and UI interactions.
 */

// Initialize Browser UUID for session tracking
let browserId = localStorage.getItem('browserId');
if (!browserId) {
    browserId = crypto.randomUUID ? crypto.randomUUID() : 'usr_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('browserId', browserId);
}

// Current note URL slug from window location
const url = window.location.pathname.split('/').filter(Boolean).pop() || 'default';

// Initialize Socket.IO connection
const socket = io({
    query: { browserId: browserId },
    transports: ['websocket'],
    upgrade: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
});

// State maps
const remoteCursors = new Map(); // userId -> { element, color, emoji, username, lastPosition, inactivityTimer }
const userData = new Map();      // userId -> { username, emoji, color, status, lastActivity }
let myCursorData = null;
let lastContent = '';
let typingTimeout = null;

// UI Elements
const textarea = document.getElementById('notepad');
const cursorContainer = document.getElementById('cursor-container');
const charCountEl = document.getElementById('charCount');
const wordCountEl = document.getElementById('wordCount');
const toastEl = document.getElementById('toastNotification');
const toastMsgEl = document.getElementById('toastMessage');

// ============================================
// Toast Notifications
// ============================================
let toastTimer = null;
function showToast(message) {
    if (!toastEl || !toastMsgEl) return;
    toastMsgEl.textContent = message;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 2800);
}

// ============================================
// Word & Character Counter
// ============================================
// Mobile element references
const charCountMobileEl = document.getElementById('charCountMobile');
const wordCountMobileEl = document.getElementById('wordCountMobile');
const clearBtnMobile = document.getElementById('clearBtnMobile');

function updateStats() {
    if (!textarea) return;
    const text = textarea.value || '';
    const charLen = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    if (charCountEl) {
        charCountEl.textContent = `${charLen.toLocaleString()} characters`;
    }
    if (wordCountEl) {
        wordCountEl.textContent = `${words.toLocaleString()} words`;
    }
    // Mobile compact counters
    if (charCountMobileEl) {
        charCountMobileEl.textContent = charLen.toLocaleString();
    }
    if (wordCountMobileEl) {
        wordCountMobileEl.textContent = words.toLocaleString();
    }
}

// ============================================
// Theme Management (Light / Dark)
// ============================================
function applyTheme(theme) {
    const isDark = theme === 'dark-mode' || theme === 'dark';
    if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    }
    localStorage.setItem('theme', isDark ? 'dark-mode' : 'light-mode');
}

// Initialize theme on page load
const savedTheme = localStorage.getItem('theme') || 'light-mode';
applyTheme(savedTheme);

const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const isCurrentDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark-mode');
        applyTheme(isCurrentDark ? 'light-mode' : 'dark-mode');
    });
}

// ============================================
// Socket.IO Real-Time Synchronization
// ============================================
const latencyEl = document.getElementById('latencyDisplay');
let currentLatency = 0;

socket.on('connect', () => {
    console.log('Connected to real-time sync server:', socket.id);
    socket.emit('joinNote', url);
    startLatencyPing();
});

// Measure latency with custom ping/pong
function measureLatency() {
    const start = Date.now();
    socket.emit('ping-latency', () => {
        currentLatency = Date.now() - start;
        if (latencyEl) {
            latencyEl.textContent = `${currentLatency}ms`;
            // Color code: green < 100ms, yellow < 300ms, red >= 300ms
            if (currentLatency < 100) {
                latencyEl.style.color = '#10b981';
            } else if (currentLatency < 300) {
                latencyEl.style.color = '#f59e0b';
            } else {
                latencyEl.style.color = '#f87171';
            }
        }
    });
}

function startLatencyPing() {
    measureLatency(); // immediate first ping
    setInterval(measureLatency, 3000);
}

socket.on('loadNote', (note) => {
    if (textarea && note) {
        textarea.value = note.content || '';
        lastContent = note.content || '';
        updateStats();
    }
});

socket.on('noteUpdated', (content) => {
    if (!textarea) return;
    const currentCursor = textarea.selectionStart;
    if (textarea.value !== content) {
        textarea.value = content;
        lastContent = content;
        textarea.selectionStart = currentCursor;
        textarea.selectionEnd = currentCursor;
        updateStats();
    }
});

// Debounce helper
function debounce(func, delay) {
    return function(...args) {
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => func.apply(this, args), delay);
    };
}

if (textarea) {
    textarea.addEventListener('input', () => {
        updateStats();
        emitCursorPositionImmediate();
    });

    textarea.addEventListener('input', debounce(() => {
        const content = textarea.value;
        if (content !== lastContent) {
            lastContent = content;
            socket.emit('updateNote', { url, content });
        }
    }, 100));
}

// ============================================
// User Presence & Count
// ============================================
const userCountEl = document.getElementById('userCount');
const statusIndicator = document.getElementById('statusIndicator');
const usersDropdown = document.getElementById('usersDropdown');
const dropdownContent = document.getElementById('dropdownContent');

socket.on('userCount', (count) => {
    if (userCountEl) {
        userCountEl.textContent = `${count} Online`;
    }
});

function renderUserAvatars() {
    const avatarContainer = document.getElementById('collaboratorAvatars');
    if (!avatarContainer) return;
    avatarContainer.innerHTML = '';

    const allUsers = [];
    if (myCursorData) {
        allUsers.push({
            id: socket.id,
            username: myCursorData.username || 'You',
            color: myCursorData.color || '#606c38',
            emoji: myCursorData.emoji || '👤',
            isSelf: true
        });
    }

    userData.forEach((user, id) => {
        if (id !== socket.id) {
            allUsers.push({
                id,
                username: user.username,
                color: user.color || '#bc6c25',
                emoji: user.emoji || '👤',
                isSelf: false
            });
        }
    });

    // Render up to 4 circular avatar bubbles
    allUsers.slice(0, 4).forEach(u => {
        const bubble = document.createElement('div');
        bubble.className = 'w-6 h-6 rounded-full ring-2 ring-white dark:ring-earth-darkCard flex items-center justify-center text-[10px] font-bold text-white shadow-sm';
        bubble.style.backgroundColor = u.color;
        bubble.title = u.isSelf ? `${u.username} (You)` : u.username;
        bubble.textContent = u.emoji || u.username.substring(0, 2).toUpperCase();
        avatarContainer.appendChild(bubble);
    });
}

// ============================================
// Collaborative Cursor Engine
// ============================================

// Calculate pixel coordinates from caret index using span-marker technique
function getCursorCoordinates(textareaEl, caretPosition) {
    try {
        if (!textareaEl || caretPosition < 0) {
            return { x: -1, y: -1 };
        }

        const style = window.getComputedStyle(textareaEl);

        // Build a mirror div that exactly replicates the textarea's text layout
        const mirror = document.createElement('div');
        mirror.style.position = 'absolute';
        mirror.style.top = '-9999px';
        mirror.style.left = '-9999px';
        mirror.style.visibility = 'hidden';

        // Copy all layout-critical styles
        const props = [
            'font', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
            'letterSpacing', 'lineHeight', 'padding', 'border', 'boxSizing',
            'wordWrap', 'overflowWrap', 'tabSize', 'textIndent'
        ];
        props.forEach(p => { mirror.style[p] = style[p]; });

        // Match textarea's content width exactly
        mirror.style.width = textareaEl.clientWidth + 'px';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordWrap = 'break-word';
        mirror.style.overflowWrap = 'break-word';

        // Insert text before caret as a text node, then a span marker at the caret
        const textBefore = textareaEl.value.substring(0, caretPosition);
        const textAfter = textareaEl.value.substring(caretPosition) || ' ';

        const beforeNode = document.createTextNode(textBefore);
        const marker = document.createElement('span');
        marker.textContent = '|';
        const afterNode = document.createTextNode(textAfter);

        mirror.appendChild(beforeNode);
        mirror.appendChild(marker);
        mirror.appendChild(afterNode);
        document.body.appendChild(mirror);

        const markerRect = marker.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();

        // Position relative to mirror top-left (padding is already included)
        const x = markerRect.left - mirrorRect.left;
        const y = markerRect.top - mirrorRect.top;

        document.body.removeChild(mirror);
        return { x, y };
    } catch (e) {
        return { x: 0, y: 0 };
    }
}

// Create a DOM element representing a remote cursor
function createCursorElement(userId, color, emoji, username) {
    if (!cursorContainer) return null;

    const cursorEl = document.createElement('div');
    cursorEl.className = 'remote-cursor';
    cursorEl.id = `cursor-${userId}`;
    cursorEl.style.display = 'none';
    cursorEl.style.opacity = '0';

    // username already includes the emoji (e.g. "🐼 Panda"), so don't render emoji separately
    cursorEl.innerHTML = `
        <div class="remote-cursor-label" style="background-color: ${color};">
            <span>${username || 'Anonymous'}</span>
        </div>
        <div class="remote-cursor-caret" style="background-color: ${color};"></div>
    `;

    cursorContainer.appendChild(cursorEl);
    return cursorEl;
}

// Update cursor position on screen
function updateCursorPosition(userId, position) {
    if (!textarea || position === null || position === undefined || position < 0) return;

    const cursorData = remoteCursors.get(userId);
    if (!cursorData || !cursorData.element) return;

    const coords = getCursorCoordinates(textarea, position);
    if (coords.x === -1 && coords.y === -1) return;

    const offsetX = Math.max(0, Math.min(textarea.clientWidth, coords.x - textarea.scrollLeft));
    const offsetY = Math.max(0, Math.min(textarea.clientHeight + 40, coords.y - textarea.scrollTop));

    const cursorEl = cursorData.element;
    requestAnimationFrame(() => {
        if (cursorEl && cursorEl.style) {
            cursorEl.style.left = `${offsetX}px`;
            cursorEl.style.top = `${offsetY}px`;
            cursorEl.style.display = 'flex';
            cursorEl.style.opacity = '1';
            cursorEl.classList.remove('cursor-inactive');
        }
    });

    // Inactivity timeout to fade cursor
    if (cursorData.inactivityTimer) {
        clearTimeout(cursorData.inactivityTimer);
    }
    cursorData.inactivityTimer = setTimeout(() => {
        if (cursorEl && cursorEl.style) {
            cursorEl.classList.add('cursor-inactive');
            setTimeout(() => {
                if (cursorEl && cursorEl.style) {
                    cursorEl.style.display = 'none';
                }
            }, 5000);
        }
    }, 6000);
}

// Remove remote cursor
function removeCursor(userId) {
    const cursorData = remoteCursors.get(userId);
    if (cursorData) {
        if (cursorData.inactivityTimer) clearTimeout(cursorData.inactivityTimer);
        if (cursorData.element) cursorData.element.remove();
        remoteCursors.delete(userId);
    }
}

// Emit my current cursor position
function emitCursorPositionImmediate() {
    if (!textarea || typeof textarea.selectionStart !== 'number') return;
    const position = textarea.selectionStart;
    socket.emit('cursor-move', {
        position: position,
        timestamp: Date.now()
    });
}

// Cursor event listeners on textarea (mouse + touch)
if (textarea) {
    textarea.addEventListener('mouseup', emitCursorPositionImmediate);
    textarea.addEventListener('click', emitCursorPositionImmediate);
    textarea.addEventListener('focus', emitCursorPositionImmediate);

    // Touch events for mobile cursor tracking
    textarea.addEventListener('touchend', (e) => {
        // Small delay to let the browser update selectionStart after touch
        setTimeout(emitCursorPositionImmediate, 50);
    });
    textarea.addEventListener('touchstart', (e) => {
        setTimeout(emitCursorPositionImmediate, 50);
    });

    textarea.addEventListener('keydown', (e) => {
        if (e.key.includes('Arrow') || e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown') {
            setTimeout(emitCursorPositionImmediate, 0);
        }
    });

    textarea.addEventListener('scroll', () => {
        remoteCursors.forEach((cursorData, userId) => {
            if (cursorData.lastPosition !== undefined && cursorData.lastPosition !== null) {
                updateCursorPosition(userId, cursorData.lastPosition);
            }
        });
    });
}

window.addEventListener('resize', () => {
    remoteCursors.forEach((cursorData, userId) => {
        if (cursorData.lastPosition !== undefined && cursorData.lastPosition !== null) {
            updateCursorPosition(userId, cursorData.lastPosition);
        }
    });
});

// Socket cursor event listeners
socket.on('existing-cursors', (cursors) => {
    if (!Array.isArray(cursors)) return;
    cursors.forEach(cursor => {
        const cursorEl = createCursorElement(cursor.userId, cursor.color, cursor.emoji, cursor.username);
        remoteCursors.set(cursor.userId, {
            element: cursorEl,
            color: cursor.color,
            emoji: cursor.emoji,
            username: cursor.username,
            lastPosition: cursor.lastPosition || 0,
            inactivityTimer: null
        });
        userData.set(cursor.userId, {
            username: cursor.username,
            emoji: cursor.emoji,
            color: cursor.color,
            status: 'online',
            lastActivity: Date.now()
        });
    });
    renderUserAvatars();
});

socket.on('cursor-join', (data) => {
    if (!data || !data.userId) return;
    if (data.userId === socket.id) {
        myCursorData = data;
        renderUserAvatars();
        return;
    }

    const cursorEl = createCursorElement(data.userId, data.color, data.emoji, data.username);
    remoteCursors.set(data.userId, {
        element: cursorEl,
        color: data.color,
        emoji: data.emoji,
        username: data.username,
        lastPosition: 0,
        inactivityTimer: null
    });
    userData.set(data.userId, {
        username: data.username,
        emoji: data.emoji,
        color: data.color,
        status: 'online',
        lastActivity: Date.now()
    });
    renderUserAvatars();
});

socket.on('cursor-move', (data) => {
    if (!data || !data.userId || data.userId === socket.id) return;
    const cursorData = remoteCursors.get(data.userId);
    if (cursorData) {
        cursorData.lastPosition = data.position;
        updateCursorPosition(data.userId, data.position);
    }
});

socket.on('cursor-leave', (data) => {
    if (!data || !data.userId) return;
    removeCursor(data.userId);
    userData.delete(data.userId);
    renderUserAvatars();
});

socket.on('disconnect', () => {
    remoteCursors.forEach((_, id) => removeCursor(id));
});

// ============================================
// Actions: URL Slug, Copy, Clear, New Note
// ============================================

// Set Custom URL
const setUrlBtn = document.getElementById('setUrlBtn');
const urlSlugInput = document.getElementById('urlSlugInput');

if (setUrlBtn && urlSlugInput) {
    setUrlBtn.addEventListener('click', async () => {
        const newSlug = urlSlugInput.value.trim();
        if (!newSlug) {
            showToast('Please enter a valid room name');
            return;
        }
        if (newSlug === url) {
            showToast('You are already using this URL');
            return;
        }

        try {
            const response = await fetch(`/setCustomUrl/${url}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: newSlug })
            });
            const result = await response.json();
            if (result.success) {
                window.location.href = `/${newSlug}`;
            } else {
                alert(result.message || 'Failed to change note URL');
            }
        } catch (err) {
            alert('Error updating custom URL');
        }
    });

    urlSlugInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            setUrlBtn.click();
        }
    });
}

// Copy Room Link
const copyLinkBtn = document.getElementById('copyLinkBtn');
if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showToast('Room link copied to clipboard!');
        } catch (err) {
            showToast('Failed to copy room link');
        }
    });
}

// Copy Content Floating Button
const copyContentFloatingBtn = document.getElementById('copyContentFloatingBtn');
if (copyContentFloatingBtn) {
    copyContentFloatingBtn.addEventListener('click', async () => {
        if (!textarea) return;
        try {
            await navigator.clipboard.writeText(textarea.value);
            showToast('Notepad content copied!');
        } catch (err) {
            showToast('Failed to copy content');
        }
    });
}

// New Note Action Button
const newNoteBtn = document.getElementById('newNoteBtn');
if (newNoteBtn) {
    newNoteBtn.addEventListener('click', () => {
        window.location.href = '/new';
    });
}

// Clear Notepad Button (desktop + mobile)
const clearBtn = document.getElementById('clearBtn');
function handleClear() {
    if (confirm('Are you sure you want to clear this notepad?')) {
        if (textarea) {
            textarea.value = '';
            lastContent = '';
            socket.emit('updateNote', { url, content: '' });
            updateStats();
            showToast('Notepad cleared');
        }
    }
}
if (clearBtn) {
    clearBtn.addEventListener('click', handleClear);
}
if (clearBtnMobile) {
    clearBtnMobile.addEventListener('click', handleClear);
}

// Keyboard shortcut: Ctrl/Cmd + S to trigger manual save feedback
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (textarea) {
            socket.emit('updateNote', { url, content: textarea.value });
            showToast('All changes saved to server!');
        }
    }
});

// Initial stats update
document.addEventListener('DOMContentLoaded', updateStats);
