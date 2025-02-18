const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    content: String,
    url: { type: String, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema); 