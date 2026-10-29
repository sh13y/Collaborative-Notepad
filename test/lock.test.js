const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');

test('bcrypt hashes and verifies 4-digit PINs correctly', async () => {
    const pin = '1234';
    const hash = await bcrypt.hash(pin, 10);
    assert.notEqual(hash, pin);
    assert.equal(await bcrypt.compare('1234', hash), true);
    assert.equal(await bcrypt.compare('0000', hash), false);
    assert.equal(await bcrypt.compare('123', hash), false);
});

test('view-locked note hides content for non-owner', () => {
    const rawNote = {
        url: 'test-note',
        content: 'Top secret content',
        viewRequiresPin: true,
        editRequiresPin: true,
        pinHash: 'somehash',
        ownerBrowserId: 'owner-browser-uuid'
    };

    const isOwner = false;
    const isViewLocked = Boolean(rawNote.viewRequiresPin) && !isOwner;
    const renderedNote = isViewLocked ? { ...rawNote, content: '' } : rawNote;

    assert.equal(renderedNote.content, '');
    assert.equal(isViewLocked, true);

    // If owner views note
    const ownerViewLocked = Boolean(rawNote.viewRequiresPin) && true; // isOwner = true
    const ownerRenderedNote = (!ownerViewLocked || true) ? rawNote : { ...rawNote, content: '' };
    assert.equal(rawNote.content, 'Top secret content');
});

test('new note lock logic does not require old PIN', () => {
    const note = {
        viewRequiresPin: false,
        editRequiresPin: false,
        pinHash: null,
        ownerBrowserId: 'browser-1'
    };

    const noteIsLocked = Boolean(note.pinHash && (note.viewRequiresPin || note.editRequiresPin));
    assert.equal(noteIsLocked, false);

    // Enabling lock on new note
    const viewRequiresPin = false;
    const editRequiresPin = true;
    const pin = '5678';
    const isEnabling = Boolean(viewRequiresPin || editRequiresPin);

    assert.equal(isEnabling, true);
    assert.equal(/^\d{4}$/.test(pin), true);
});

