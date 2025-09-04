const cron = require('node-cron');
const Note = require('../models/Note');

class CleanupService {
    constructor() {
        this.isRunning = false;
    }

    // Start the cleanup scheduler
    start() {
        console.log('🧹 Starting automatic cleanup service...');
        
        // Run cleanup every day at 2:00 AM
        cron.schedule('0 2 * * *', async () => {
            await this.cleanupOldEmptyNotes();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        // Optional: Run cleanup every hour for more frequent cleaning
        // Uncomment the line below if you want hourly cleanup instead
        // cron.schedule('0 * * * *', async () => {
        //     await this.cleanupOldEmptyNotes();
        // });

        console.log('✅ Cleanup service started - will run daily at 2:00 AM UTC');
    }

    // Manual cleanup function
    async cleanupOldEmptyNotes() {
        if (this.isRunning) {
            console.log('⏳ Cleanup already running, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('🧹 Starting automatic cleanup of old empty notes...');

        try {
            // Calculate date 7 days ago
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Find empty notes older than 7 days
            const result = await Note.deleteMany({
                $and: [
                    // Empty content conditions
                    {
                        $or: [
                            { content: '' },
                            { content: /^\s*$/ }, // Only whitespace
                            { content: { $exists: false } }
                        ]
                    },
                    // Older than 7 days
                    {
                        createdAt: { $lt: sevenDaysAgo }
                    }
                ]
            });

            if (result.deletedCount > 0) {
                console.log(`🗑️  Automatically deleted ${result.deletedCount} empty notes older than 7 days`);
            } else {
                console.log('✨ No old empty notes found to cleanup');
            }

            return {
                success: true,
                deletedCount: result.deletedCount,
                message: `Deleted ${result.deletedCount} old empty notes`
            };

        } catch (error) {
            console.error('❌ Error during automatic cleanup:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isRunning = false;
        }
    }

    // Get cleanup stats
    async getCleanupStats() {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Count empty notes older than 7 days
            const oldEmptyNotesCount = await Note.countDocuments({
                $and: [
                    {
                        $or: [
                            { content: '' },
                            { content: /^\s*$/ },
                            { content: { $exists: false } }
                        ]
                    },
                    {
                        createdAt: { $lt: sevenDaysAgo }
                    }
                ]
            });

            // Count recent empty notes (less than 7 days)
            const recentEmptyNotesCount = await Note.countDocuments({
                $and: [
                    {
                        $or: [
                            { content: '' },
                            { content: /^\s*$/ },
                            { content: { $exists: false } }
                        ]
                    },
                    {
                        createdAt: { $gte: sevenDaysAgo }
                    }
                ]
            });

            return {
                oldEmptyNotes: oldEmptyNotesCount,
                recentEmptyNotes: recentEmptyNotesCount,
                totalEmptyNotes: oldEmptyNotesCount + recentEmptyNotesCount
            };

        } catch (error) {
            console.error('Error getting cleanup stats:', error);
            return {
                oldEmptyNotes: 0,
                recentEmptyNotes: 0,
                totalEmptyNotes: 0
            };
        }
    }
}

module.exports = new CleanupService();
