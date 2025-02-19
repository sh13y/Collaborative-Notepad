const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    content: String,
    url: { type: String, unique: true },
    activeUsers: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema); 