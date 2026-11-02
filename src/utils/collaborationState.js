const Y = require('yjs');
const NoteUpdate = require('../models/NoteUpdate');

async function loadDocument(url, initialContent = '') {
    const document = new Y.Doc();
    const text = document.getText('content');

    const updates = await NoteUpdate.find({ noteUrl: url })
        .sort({ createdAt: 1, _id: 1 })
        .select('update')
        .lean();

    let appliedUpdates = 0;
    for (const storedUpdate of updates) {
        const update = toUint8Array(storedUpdate.update);
        try {
            if (update.length === 0) {
                throw new Error('empty update');
            }
            Y.applyUpdate(document, update);
            appliedUpdates++;
        } catch (error) {
            console.warn(`Skipping invalid collaboration update for note "${url}": ${error.message}`);
        }
    }

    // Notes created before CRDT persistence, or notes with only invalid updates,
    // can still be opened from their denormalized content field.
    if (appliedUpdates === 0 && initialContent) {
        text.insert(0, initialContent);
    }

    return document;
}

function toUint8Array(value) {
    if (Buffer.isBuffer(value)) {
        return new Uint8Array(value);
    }
    if (value instanceof Uint8Array) {
        return value;
    }
    // Handle Mongoose Binary objects returned with .lean()
    // They have a buffer property or can be converted via toString('base64')
    if (value && value._bsontype === 'Binary') {
        const base64 = value.toString('base64');
        const buffer = Buffer.from(base64, 'base64');
        return new Uint8Array(buffer);
    }
    // Handle Mongoose Binary objects with buffer property
    if (value && value.buffer && Buffer.isBuffer(value.buffer)) {
        return new Uint8Array(value.buffer);
    }
    // Handle Mongoose Binary objects with buffer() method
    if (value && typeof value.buffer === 'function') {
        const buffer = value.buffer();
        return new Uint8Array(buffer);
    }
    // Handle Mongoose Buffer objects returned with .lean()
    // They have the format: { type: 'Buffer', data: [...] }
    if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
        return Uint8Array.from(value.data);
    }
    // Handle plain objects with data array
    if (value && Array.isArray(value.data)) {
        return Uint8Array.from(value.data);
    }
    // Handle base64 encoded strings (stored in database)
    if (typeof value === 'string') {
        try {
            const buffer = Buffer.from(value, 'base64');
            return new Uint8Array(buffer);
        } catch (error) {
            throw new Error(`Invalid base64 update buffer: ${error.message}`);
        }
    }
    throw new Error('invalid update buffer');
}

function encodeState(document) {
    return Buffer.from(Y.encodeStateAsUpdate(document)).toString('base64');
}

function decodeUpdate(encodedUpdate) {
    if (typeof encodedUpdate !== 'string' ||
        encodedUpdate.length === 0 ||
        encodedUpdate.length % 4 !== 0 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(encodedUpdate)) {
        throw new Error('Invalid collaboration update');
    }

    const update = Buffer.from(encodedUpdate, 'base64');
    if (update.length === 0) {
        throw new Error('Invalid collaboration update');
    }

    try {
        Y.applyUpdate(new Y.Doc(), new Uint8Array(update));
    } catch (error) {
        throw new Error(`Invalid collaboration update: ${error.message}`);
    }

    return update;
}

module.exports = { loadDocument, encodeState, decodeUpdate, toUint8Array };
