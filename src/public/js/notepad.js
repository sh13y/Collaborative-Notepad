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
const collaborationDoc = new Y.Doc();
const collaborationText = collaborationDoc.getText('content');
let applyingRemoteUpdate = false;

// Initial state from server injected lockInfo for 0ms delay
const serverLockInfo = window.__lockInfo || {};
const isOwnerInitial = Boolean(window.__isOwner || (serverLockInfo.ownerBrowserId && serverLockInfo.ownerBrowserId === browserId));

let canEdit = Boolean(isOwnerInitial || !serverLockInfo.editRequiresPin);
let canView = Boolean(isOwnerInitial || !serverLockInfo.viewRequiresPin);
// UI Elements
const textarea = document.getElementById('notepad');
const cursorContainer = document.getElementById('cursor-container');
const charCountEl = document.getElementById('charCount');
const wordCountEl = document.getElementById('wordCount');
const toastEl = document.getElementById('toastNotification');
const toastMsgEl = document.getElementById('toastMessage');

// Lock UI Elements
const lockNoteBtn = document.getElementById('lockNoteBtn');
const lockIconUnlocked = document.getElementById('lockIconUnlocked');
const lockIconLocked = document.getElementById('lockIconLocked');
const editLockNotice = document.getElementById('editLockNotice');
const unlockEditBtn = document.getElementById('unlockEditBtn');
const unlockModal = document.getElementById('unlockModal');
const unlockPin = document.getElementById('unlockPin');
const unlockModalMessage = document.getElementById('unlockModalMessage');
const unlockSpinner = document.getElementById('unlockSpinner');
const confirmUnlockBtn = document.getElementById('confirmUnlockBtn');
const cancelUnlockBtn = document.getElementById('cancelUnlockBtn');

const viewLockOverlay = document.getElementById('viewLockOverlay');
const viewLockPinGroup = document.getElementById('viewLockPinGroup');
const viewLockMessage = document.getElementById('viewLockMessage');
const viewLockSpinner = document.getElementById('viewLockSpinner');
const viewLockUnlockBtn = document.getElementById('viewLockUnlockBtn');

const lockModal = document.getElementById('lockModal');
const closeLockModalBtn = document.getElementById('closeLockModalBtn');
const cancelLockBtn = document.getElementById('cancelLockBtn');
const confirmLockBtn = document.getElementById('confirmLockBtn');
const lockViewToggle = document.getElementById('lockViewToggle');
const lockEditToggle = document.getElementById('lockEditToggle');
const currentPinSection = document.getElementById('currentPinSection');
const currentLockPin = document.getElementById('currentLockPin');
const newPinSection = document.getElementById('newPinSection');
const newPinLabel = document.getElementById('newPinLabel');
const newLockPin = document.getElementById('newLockPin');
const lockModalMessage = document.getElementById('lockModalMessage');

let lockSettings = {
    viewRequiresPin: Boolean(serverLockInfo.viewRequiresPin),
    editRequiresPin: Boolean(serverLockInfo.editRequiresPin),
    hasPin: Boolean(serverLockInfo.hasPin),
    isOwner: isOwnerInitial,
    authenticated: isOwnerInitial,
    canView: canView,
    canEdit: canEdit
};
let lockStatusReady = true;

// Helpers for 4-digit PIN groups
function getPinValue(group) {
    return group ? Array.from(group.querySelectorAll('.pin-digit')).map(input => input.value).join('') : '';
}

function clearPinValue(group) {
    if (!group) return;
    group.querySelectorAll('.pin-digit').forEach(input => {
        input.value = '';
        input.classList.remove('has-value');
    });
}

function shakePinGroup(group) {
    if (!group) return;
    group.classList.remove('pin-shake');
    void group.offsetWidth; // trigger reflow
    group.classList.add('pin-shake');
    setTimeout(() => {
        group.classList.remove('pin-shake');
    }, 500);
}

function pulsePinSuccess(group) {
    if (!group) return;
    group.classList.remove('pin-success');
    void group.offsetWidth; // trigger reflow
    group.classList.add('pin-success');
    setTimeout(() => {
        group.classList.remove('pin-success');
    }, 600);
}

function setupPinGroup(group, onComplete) {
    if (!group) return;
    const inputs = Array.from(group.querySelectorAll('.pin-digit'));
    inputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            const val = input.value.replace(/\D/g, '');
            input.value = val ? val.slice(-1) : '';
            input.classList.toggle('has-value', Boolean(input.value));

            if (input.value && inputs[index + 1]) {
                inputs[index + 1].focus();
            }

            const currentPin = getPinValue(group);
            if (currentPin.length === inputs.length && typeof onComplete === 'function') {
                onComplete(currentPin);
            }
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace') {
                if (!input.value && inputs[index - 1]) {
                    inputs[index - 1].focus();
                    inputs[index - 1].value = '';
                    inputs[index - 1].classList.remove('has-value');
                    event.preventDefault();
                } else {
                    input.classList.remove('has-value');
                }
            } else if (event.key === 'ArrowLeft' && inputs[index - 1]) {
                inputs[index - 1].focus();
                event.preventDefault();
            } else if (event.key === 'ArrowRight' && inputs[index + 1]) {
                inputs[index + 1].focus();
                event.preventDefault();
            } else if (event.key === 'Enter') {
                const currentPin = getPinValue(group);
                if (typeof onComplete === 'function') {
                    onComplete(currentPin);
                }
            }
        });

        input.addEventListener('paste', (event) => {
            event.preventDefault();
            const pasted = (event.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, inputs.length);
            pasted.split('').forEach((digit, digitIndex) => {
                if (inputs[digitIndex]) {
                    inputs[digitIndex].value = digit;
                    inputs[digitIndex].classList.add('has-value');
                }
            });
            const nextFocusIndex = Math.min(pasted.length, inputs.length - 1);
            inputs[nextFocusIndex]?.focus();

            const currentPin = getPinValue(group);
            if (currentPin.length === inputs.length && typeof onComplete === 'function') {
                onComplete(currentPin);
            }
        });
    });
}

function closeLockModal() {
    if (!lockModal) return;
    lockModal.classList.add('hidden');
    lockModal.classList.remove('flex');
    if (lockModalMessage) lockModalMessage.classList.add('hidden');
    clearPinValue(currentLockPin);
    clearPinValue(newLockPin);
}

function closeUnlockModal() {
    if (!unlockModal) return;
    unlockModal.classList.add('hidden');
    unlockModal.classList.remove('flex');
    clearPinValue(unlockPin);
    if (unlockModalMessage) unlockModalMessage.classList.add('hidden');
    if (unlockSpinner) unlockSpinner.classList.add('hidden');
    if (confirmUnlockBtn) confirmUnlockBtn.disabled = false;
}

function openUnlockModal(access = 'edit') {
    if (!unlockModal) return;
    unlockModal.dataset.access = access;
    const titleEl = document.getElementById('unlockModalTitle');
    const descEl = document.getElementById('unlockModalDescription');
    if (titleEl) titleEl.textContent = access === 'view' ? 'Unlock note' : 'Unlock editing';
    if (descEl) descEl.textContent = access === 'view' ? 'Enter the 4-digit PIN to view this note.' : 'Enter the 4-digit PIN to enable editing.';
    clearPinValue(unlockPin);
    if (unlockModalMessage) unlockModalMessage.classList.add('hidden');
    unlockModal.classList.remove('hidden');
    unlockModal.classList.add('flex');
    setTimeout(() => {
        unlockPin?.querySelector('.pin-digit')?.focus();
    }, 50);
}

function refreshLockModalFields() {
    const isEnabling = Boolean(lockViewToggle?.checked || lockEditToggle?.checked);
    const hasExistingLock = Boolean(lockSettings.hasPin || lockSettings.viewRequiresPin || lockSettings.editRequiresPin);

    if (currentPinSection) {
        currentPinSection.classList.toggle('hidden', !hasExistingLock);
    }
    if (newPinSection) {
        newPinSection.classList.toggle('hidden', !isEnabling);
    }
    if (newPinLabel) {
        if (hasExistingLock) {
            newPinLabel.innerHTML = 'New PIN <span class="font-normal text-earth-forest/50 dark:text-earth-cream/50">(leave blank to keep current PIN)</span>';
        } else {
            newPinLabel.innerHTML = 'Set 4-digit PIN <span class="font-normal text-earth-forest/50 dark:text-earth-cream/50">(required)</span>';
        }
    }
}

function openLockModal() {
    const isLocked = Boolean(lockSettings.hasPin || lockSettings.viewRequiresPin || lockSettings.editRequiresPin);

    // If note is locked and user cannot view or edit, open unlock modal
    if (isLocked && !lockSettings.isOwner && !lockSettings.authenticated) {
        if (lockSettings.viewRequiresPin && !lockSettings.canView) {
            if (viewLockOverlay && !viewLockOverlay.classList.contains('hidden')) {
                viewLockPinGroup?.querySelector('.pin-digit')?.focus();
            } else {
                openUnlockModal('view');
            }
            return;
        }
        if (lockSettings.editRequiresPin && !lockSettings.canEdit) {
            openUnlockModal('edit');
            return;
        }
    }

    if (lockViewToggle) lockViewToggle.checked = Boolean(lockSettings.viewRequiresPin);
    if (lockEditToggle) lockEditToggle.checked = Boolean(lockSettings.editRequiresPin);
    clearPinValue(currentLockPin);
    clearPinValue(newLockPin);
    if (lockModalMessage) lockModalMessage.classList.add('hidden');
    if (confirmLockBtn) {
        confirmLockBtn.disabled = false;
        confirmLockBtn.textContent = 'Save';
    }

    refreshLockModalFields();

    if (lockModal) {
        lockModal.classList.remove('hidden');
        lockModal.classList.add('flex');
    }

    const hasExistingLock = Boolean(lockSettings.hasPin || lockSettings.viewRequiresPin || lockSettings.editRequiresPin);
    setTimeout(() => {
        if (hasExistingLock) {
            currentLockPin?.querySelector('.pin-digit')?.focus();
        } else if (lockViewToggle?.checked || lockEditToggle?.checked) {
            newLockPin?.querySelector('.pin-digit')?.focus();
        }
    }, 100);
}

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

socket.on('loadNoteState', (noteState) => {
    if (textarea && noteState && typeof noteState.state === 'string') {
        applyingRemoteUpdate = true;
        Y.applyUpdate(collaborationDoc, Uint8Array.from(atob(noteState.state), character => character.charCodeAt(0)));
        textarea.value = collaborationText.toString();
        updateStats();
        applyingRemoteUpdate = false;
    }
});

function updateLockUI() {
    const isLocked = Boolean(lockSettings.viewRequiresPin || lockSettings.editRequiresPin || lockSettings.hasPin);
    const lockBtn = document.getElementById('lockNoteBtn');
    const lockIconUnlocked = document.getElementById('lockIconUnlocked');
    const lockIconLocked = document.getElementById('lockIconLocked');

    if (lockBtn) {
        lockBtn.classList.toggle('is-unlocked', !isLocked);
        lockBtn.classList.toggle('is-locked', isLocked);
        lockBtn.setAttribute('aria-label', isLocked ? 'Note is locked' : 'Note is unlocked');
        if (isLocked) {
            lockBtn.setAttribute('title', lockSettings.isOwner ? 'Manage note lock' : (lockSettings.authenticated ? 'Note is protected (unlocked)' : 'Note is locked'));
        } else {
            lockBtn.setAttribute('title', lockSettings.isOwner ? 'Lock note' : 'Note is not locked');
        }
    }
    if (lockIconUnlocked && lockIconLocked) {
        lockIconUnlocked.classList.toggle('hidden', isLocked);
        lockIconLocked.classList.toggle('hidden', !isLocked);
    }

    if (textarea) {
        textarea.readOnly = !canEdit;
    }
    if (editLockNotice) {
        editLockNotice.classList.toggle('hidden', canEdit || !canView);
    }
    if (viewLockOverlay) {
        viewLockOverlay.classList.toggle('hidden', canView);
    }
}

// Initial UI lock state application
updateLockUI();

socket.on('lockStatus', status => {
    lockSettings = { ...lockSettings, ...status };
    lockStatusReady = true;
    canEdit = Boolean(status.canEdit);
    canView = Boolean(status.canView);
    updateLockUI();
    if (!canView && !viewLockOverlay) {
        openUnlockModal('view');
    }
});

socket.on('lockChanged', status => {
    lockSettings = { ...lockSettings, ...status };
    canEdit = Boolean(status.canEdit);
    canView = Boolean(status.canView);
    updateLockUI();
    if (!canView) {
        if (textarea) textarea.value = '';
        if (viewLockOverlay) {
            viewLockOverlay.classList.remove('hidden');
            clearPinValue(viewLockPinGroup);
            viewLockPinGroup?.querySelector('.pin-digit')?.focus();
        } else {
            openUnlockModal('view');
        }
    }
});

socket.on('lockRequired', ({ access }) => {
    if (access === 'edit') {
        if (editLockNotice) editLockNotice.classList.remove('hidden');
        showToast('Editing is locked. Enter PIN to unlock editing.');
        return;
    }
    if (viewLockOverlay) {
        viewLockOverlay.classList.remove('hidden');
        viewLockPinGroup?.querySelector('.pin-digit')?.focus();
    } else {
        openUnlockModal('view');
    }
});

socket.on('lockError', message => {
    // 1. If view-lock overlay is active
    if (viewLockOverlay && !viewLockOverlay.classList.contains('hidden')) {
        if (viewLockSpinner) viewLockSpinner.classList.add('hidden');
        if (viewLockUnlockBtn) viewLockUnlockBtn.disabled = false;
        if (viewLockMessage) {
            viewLockMessage.textContent = message || 'Incorrect PIN. Try again.';
            viewLockMessage.classList.remove('hidden');
        }
        shakePinGroup(viewLockPinGroup);
        clearPinValue(viewLockPinGroup);
        viewLockPinGroup?.querySelector('.pin-digit')?.focus();
    }

    // 2. If edit unlock modal is open
    if (unlockModal && !unlockModal.classList.contains('hidden')) {
        if (unlockSpinner) unlockSpinner.classList.add('hidden');
        if (confirmUnlockBtn) confirmUnlockBtn.disabled = false;
        if (unlockModalMessage) {
            unlockModalMessage.textContent = message || 'Incorrect PIN. Try again.';
            unlockModalMessage.classList.remove('hidden');
        }
        shakePinGroup(unlockPin);
        clearPinValue(unlockPin);
        unlockPin?.querySelector('.pin-digit')?.focus();
    }

    // 3. If lock settings modal (owner) is open
    if (lockModal && !lockModal.classList.contains('hidden')) {
        if (confirmLockBtn) {
            confirmLockBtn.disabled = false;
            confirmLockBtn.textContent = 'Save';
        }
        if (lockModalMessage) {
            lockModalMessage.textContent = message;
            lockModalMessage.classList.remove('hidden');
        }
        if (message && message.toLowerCase().includes('current')) {
            shakePinGroup(currentLockPin);
            clearPinValue(currentLockPin);
            currentLockPin?.querySelector('.pin-digit')?.focus();
        } else {
            shakePinGroup(newLockPin);
            clearPinValue(newLockPin);
            newLockPin?.querySelector('.pin-digit')?.focus();
        }
    } else if ((!viewLockOverlay || viewLockOverlay.classList.contains('hidden')) && (!unlockModal || unlockModal.classList.contains('hidden'))) {
        showToast(message);
    }
});

socket.on('lockAuthenticated', () => {
    lockSettings.authenticated = true;
    canView = true;
    canEdit = true;
    lockSettings.canView = true;
    lockSettings.canEdit = true;

    if (viewLockSpinner) viewLockSpinner.classList.add('hidden');
    if (viewLockUnlockBtn) viewLockUnlockBtn.disabled = false;
    if (unlockSpinner) unlockSpinner.classList.add('hidden');
    if (confirmUnlockBtn) confirmUnlockBtn.disabled = false;

    pulsePinSuccess(viewLockPinGroup);
    pulsePinSuccess(unlockPin);

    setTimeout(() => {
        closeUnlockModal();
        updateLockUI();
        showToast('Note unlocked successfully!');
        if (textarea) textarea.focus();
    }, 200);
});

socket.on('lockSaved', () => {
    if (confirmLockBtn) {
        confirmLockBtn.disabled = false;
        confirmLockBtn.textContent = 'Save';
    }
    closeLockModal();
    updateLockUI();
    showToast('Note access settings saved!');
});

socket.on('crdt-update', (encodedUpdate) => {
    if (typeof encodedUpdate !== 'string') return;
    const bytes = Uint8Array.from(atob(encodedUpdate), character => character.charCodeAt(0));
    applyingRemoteUpdate = true;
    Y.applyUpdate(collaborationDoc, bytes);
    if (textarea && textarea.value !== collaborationText.toString()) {
        const currentCursor = textarea.selectionStart;
        textarea.value = collaborationText.toString();
        textarea.selectionStart = Math.min(currentCursor, textarea.value.length);
        textarea.selectionEnd = textarea.selectionStart;
        updateStats();
    }
    applyingRemoteUpdate = false;
});

collaborationDoc.on('update', update => {
    if (applyingRemoteUpdate) return;
    if (!canEdit) return;
    socket.emit('updateNote', {
        url,
        updateId: crypto.randomUUID(),
        update: btoa(String.fromCharCode(...update))
    });
});

if (textarea) {
    textarea.addEventListener('input', () => {
        updateStats();
        emitCursorPositionImmediate();
        if (applyingRemoteUpdate) return;

        const previousContent = collaborationText.toString();
        const nextContent = textarea.value;
        let start = 0;
        while (start < previousContent.length &&
            start < nextContent.length &&
            previousContent[start] === nextContent[start]) {
            start++;
        }

        let previousEnd = previousContent.length;
        let nextEnd = nextContent.length;
        while (previousEnd > start && nextEnd > start &&
            previousContent[previousEnd - 1] === nextContent[nextEnd - 1]) {
            previousEnd--;
            nextEnd--;
        }

        collaborationDoc.transact(() => {
            if (previousEnd > start) {
                collaborationText.delete(start, previousEnd - start);
            }
            if (nextEnd > start) {
                collaborationText.insert(start, nextContent.slice(start, nextEnd));
            }
        });
    });
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
    if (urlSlugInput.disabled || setUrlBtn.disabled) {
        urlSlugInput.title = 'Custom URL cannot be changed again';
    }
    setUrlBtn.addEventListener('click', async () => {
        if (urlSlugInput.disabled || setUrlBtn.disabled) return;
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
                urlSlugInput.disabled = true;
                setUrlBtn.disabled = true;
                urlSlugInput.title = 'Custom URL cannot be changed again';
                setUrlBtn.title = 'Custom URL cannot be changed again';
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

// ============================================
// Lock Mechanism Event Listeners & Actions
// ============================================

// Submit view-lock unlock
function submitViewUnlock(pin) {
    const pinToSubmit = pin || getPinValue(viewLockPinGroup);
    if (!/^\d{4}$/.test(pinToSubmit)) {
        if (viewLockMessage) {
            viewLockMessage.textContent = 'Enter a valid 4-digit PIN.';
            viewLockMessage.classList.remove('hidden');
        }
        shakePinGroup(viewLockPinGroup);
        return;
    }
    if (viewLockSpinner) viewLockSpinner.classList.remove('hidden');
    if (viewLockUnlockBtn) viewLockUnlockBtn.disabled = true;
    if (viewLockMessage) viewLockMessage.classList.add('hidden');
    socket.emit('authenticateNote', { pin: pinToSubmit });
}

// Submit edit-lock unlock
function submitEditUnlock(pin) {
    const pinToSubmit = pin || getPinValue(unlockPin);
    if (!/^\d{4}$/.test(pinToSubmit)) {
        if (unlockModalMessage) {
            unlockModalMessage.textContent = 'Enter a valid 4-digit PIN.';
            unlockModalMessage.classList.remove('hidden');
        }
        shakePinGroup(unlockPin);
        return;
    }
    if (unlockSpinner) unlockSpinner.classList.remove('hidden');
    if (confirmUnlockBtn) confirmUnlockBtn.disabled = true;
    if (unlockModalMessage) unlockModalMessage.classList.add('hidden');
    socket.emit('authenticateNote', { pin: pinToSubmit });
}

// Setup PIN groups with auto-submit
if (viewLockPinGroup) {
    setupPinGroup(viewLockPinGroup, (pin) => {
        submitViewUnlock(pin);
    });
}
if (viewLockUnlockBtn) {
    viewLockUnlockBtn.addEventListener('click', () => submitViewUnlock());
}

if (unlockPin) {
    setupPinGroup(unlockPin, (pin) => {
        submitEditUnlock(pin);
    });
}
if (confirmUnlockBtn) {
    confirmUnlockBtn.addEventListener('click', () => submitEditUnlock());
}
if (cancelUnlockBtn) cancelUnlockBtn.addEventListener('click', closeUnlockModal);
if (unlockModal) {
    unlockModal.addEventListener('click', (event) => {
        if (event.target === unlockModal) closeUnlockModal();
    });
}

if (lockNoteBtn) {
    lockNoteBtn.addEventListener('click', openLockModal);
}
if (unlockEditBtn) {
    unlockEditBtn.addEventListener('click', () => openUnlockModal('edit'));
}

if (closeLockModalBtn) closeLockModalBtn.addEventListener('click', closeLockModal);
if (cancelLockBtn) cancelLockBtn.addEventListener('click', closeLockModal);
if (lockModal) {
    lockModal.addEventListener('click', (event) => {
        if (event.target === lockModal) closeLockModal();
    });
}

// Toggles in owner lock settings
if (lockViewToggle && lockEditToggle) {
    lockViewToggle.addEventListener('change', () => {
        refreshLockModalFields();
        if (lockViewToggle.checked && newPinSection && !newPinSection.classList.contains('hidden')) {
            newLockPin?.querySelector('.pin-digit')?.focus();
        }
    });
    lockEditToggle.addEventListener('change', () => {
        refreshLockModalFields();
        if (lockEditToggle.checked && newPinSection && !newPinSection.classList.contains('hidden')) {
            newLockPin?.querySelector('.pin-digit')?.focus();
        }
    });
}

// Pin group handlers for lock modal
if (currentLockPin) {
    setupPinGroup(currentLockPin, () => {
        if (newPinSection && !newPinSection.classList.contains('hidden')) {
            newLockPin?.querySelector('.pin-digit')?.focus();
        } else if (confirmLockBtn) {
            confirmLockBtn.click();
        }
    });
}

if (newLockPin) {
    setupPinGroup(newLockPin, () => {
        if (confirmLockBtn) {
            confirmLockBtn.click();
        }
    });
}

// Confirm save in owner lock settings
if (confirmLockBtn) {
    confirmLockBtn.addEventListener('click', () => {
        const isEnabling = Boolean(lockViewToggle.checked || lockEditToggle.checked);
        const hasExistingLock = Boolean(lockSettings.hasPin || lockSettings.viewRequiresPin || lockSettings.editRequiresPin);
        const oldPin = getPinValue(currentLockPin);
        const pin = getPinValue(newLockPin);

        // If note already has a lock, current PIN is required:
        if (hasExistingLock && !/^\d{4}$/.test(oldPin)) {
            if (lockModalMessage) {
                lockModalMessage.textContent = 'Enter your current 4-digit PIN to make changes.';
                lockModalMessage.classList.remove('hidden');
            }
            shakePinGroup(currentLockPin);
            currentLockPin?.querySelector('.pin-digit')?.focus();
            return;
        }

        // If setting a lock for the first time:
        if (!hasExistingLock && isEnabling) {
            if (!/^\d{4}$/.test(pin)) {
                if (lockModalMessage) {
                    lockModalMessage.textContent = 'Enter a 4-digit PIN to secure this note.';
                    lockModalMessage.classList.remove('hidden');
                }
                shakePinGroup(newLockPin);
                newLockPin?.querySelector('.pin-digit')?.focus();
                return;
            }
        }

        // If changing an existing lock and entered a partial PIN:
        if (hasExistingLock && isEnabling && pin && !/^\d{4}$/.test(pin)) {
            if (lockModalMessage) {
                lockModalMessage.textContent = 'New PIN must be exactly 4 digits.';
                lockModalMessage.classList.remove('hidden');
            }
            shakePinGroup(newLockPin);
            newLockPin?.querySelector('.pin-digit')?.focus();
            return;
        }

        confirmLockBtn.disabled = true;
        confirmLockBtn.textContent = 'Saving...';
        if (lockModalMessage) lockModalMessage.classList.add('hidden');

        socket.emit('updateLock', {
            oldPin: oldPin || undefined,
            pin: pin || (hasExistingLock ? oldPin : undefined),
            viewRequiresPin: lockViewToggle.checked,
            editRequiresPin: lockEditToggle.checked
        });
    });
}

// Global escape key to close open dialogs
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLockModal();
        if (unlockModal && unlockModal.dataset.access === 'edit') {
            closeUnlockModal();
        }
    }
});

// Clear Notepad Button (desktop + mobile)
const clearBtn = document.getElementById('clearBtn');
function handleClear() {
    if (confirm('Are you sure you want to clear this notepad?')) {
        if (textarea) {
            textarea.value = '';
            const currentLength = collaborationText.length;
            collaborationDoc.transact(() => {
                if (currentLength > 0) {
                    collaborationText.delete(0, currentLength);
                }
            });
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
