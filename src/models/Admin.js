const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    password: { type: String, required: true },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', adminSchema); 