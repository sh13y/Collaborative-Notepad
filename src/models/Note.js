const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    content: String,
    url: { type: String, unique: true },
    customUrlLocked: { type: Boolean, default: false },
    ownerBrowserId: { type: String, default: null },
    pinHash: { type: String, default: null },
    viewRequiresPin: { type: Boolean, default: false },
    editRequiresPin: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema); 