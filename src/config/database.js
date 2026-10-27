const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is required to start Collaborative Notepad');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.log('MongoDB connection error:', err.message);
        throw err;
    }
};

module.exports = connectDB; 