const mongoose = require('mongoose');
require('dotenv').config();

// Import Note model
const Note = require('./src/models/Note');

async function cleanupBlankNotes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find notes with empty or whitespace-only content
        const blankNotes = await Note.find({
            $or: [
                { content: '' },
                { content: /^\s*$/ }, // Only whitespace
                { content: { $exists: false } }
            ]
        });

        console.log(`Found ${blankNotes.length} blank notes`);

        if (blankNotes.length > 0) {
            // Show some examples
            console.log('Sample blank notes:');
            blankNotes.slice(0, 5).forEach(note => {
                console.log(`- URL: ${note.url}, Created: ${note.createdAt}, Content: "${note.content}"`);
            });

            // Ask for confirmation (in a real environment, you'd want user input)
            console.log('\nTo delete these notes, uncomment the delete line below and run again.');
            
            // Uncomment the line below to actually delete the blank notes
            // const result = await Note.deleteMany({
            //     $or: [
            //         { content: '' },
            //         { content: /^\s*$/ },
            //         { content: { $exists: false } }
            //     ]
            // });
            // console.log(`Deleted ${result.deletedCount} blank notes`);
        } else {
            console.log('No blank notes found');
        }

        // Show stats
        const totalNotes = await Note.countDocuments();
        const notesWithContent = await Note.countDocuments({
            content: { $exists: true, $ne: '', $not: /^\s*$/ }
        });

        console.log(`\nDatabase stats:`);
        console.log(`Total notes: ${totalNotes}`);
        console.log(`Notes with content: ${notesWithContent}`);
        console.log(`Blank notes: ${totalNotes - notesWithContent}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

cleanupBlankNotes();
