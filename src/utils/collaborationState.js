const Y = require('yjs');
const NoteUpdate = require('../models/NoteUpdate');

async function loadDocument(url, initialContent = '') {
    const document = new Y.Doc();
    const text = document.getText('content');

    const updates = await NoteUpdate.find({ noteUrl: url })
        .sort({ createdAt: 1, _id: 1 })
        .select('update')
        .lean();

    // Notes created before CRDT persistence have no updates to replay.
    if (updates.length === 0 && initialContent) {
        text.insert(0, initialContent);
    }

    for (const storedUpdate of updates) {
        Y.applyUpdate(document, new Uint8Array(storedUpdate.update));
    }

    return document;
}

function encodeState(document) {
    return Buffer.from(Y.encodeStateAsUpdate(document)).toString('base64');
}

function decodeUpdate(encodedUpdate) {
    if (typeof encodedUpdate !== 'string' || encodedUpdate.length === 0) {
        throw new Error('Invalid collaboration update');
    }

    return Buffer.from(encodedUpdate, 'base64');
}

module.exports = { loadDocument, encodeState, decodeUpdate };
