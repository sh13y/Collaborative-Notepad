const mongoose = require('mongoose');

const noteUpdateSchema = new mongoose.Schema({
    noteUrl: { type: String, required: true },
    updateId: { type: String, required: true },
    update: { type: Buffer, required: true }
}, { timestamps: true });

noteUpdateSchema.index({ noteUrl: 1, createdAt: 1 });
noteUpdateSchema.index({ noteUrl: 1, updateId: 1 }, { unique: true });

module.exports = mongoose.model('NoteUpdate', noteUpdateSchema);
