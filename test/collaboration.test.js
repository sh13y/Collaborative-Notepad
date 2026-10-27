const test = require('node:test');
const assert = require('node:assert/strict');
const Y = require('yjs');

function createDocument(content = '') {
    const document = new Y.Doc();
    document.getText('content').insert(0, content);
    return document;
}

test('concurrent edits are merged without last-write-wins loss', () => {
    const first = createDocument('hello');
    const second = createDocument();

    Y.applyUpdate(second, Y.encodeStateAsUpdate(first));

    first.getText('content').insert(5, ' world');
    second.getText('content').insert(0, 'Say ');

    const firstUpdate = Y.encodeStateAsUpdate(first);
    const secondUpdate = Y.encodeStateAsUpdate(second);
    Y.applyUpdate(first, secondUpdate);
    Y.applyUpdate(second, firstUpdate);

    assert.equal(first.getText('content').toString(), second.getText('content').toString());
    assert.equal(first.getText('content').toString(), 'Say hello world');
});

test('a document can be reconstructed from persisted CRDT updates', () => {
    const source = createDocument();
    source.getText('content').insert(0, 'durable note');

    const restored = createDocument();
    Y.applyUpdate(restored, Y.encodeStateAsUpdate(source));

    assert.equal(restored.getText('content').toString(), 'durable note');
});
