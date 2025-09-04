const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.log('No MongoDB URI provided, running without database');
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.log('MongoDB connection error:', err.message);
        console.log('Continuing without database connection...');
        // Don't exit, continue without database
    }
};

module.exports = connectDB; 