const mongoose = require('mongoose');

// Schema will define the structure of the documents that will
// be later stored inside a collection
const Schema = mongoose.Schema;     // Constructor function

// Creates new instance of schema object
// Describes the structure of what is to be stored
const memberSchema = new Schema({
    username:{
        type: String,
        required: true
    },
    userId: {
        // Cruly brackets allow to add options
        type: String,
        required: true,

    },
    timezone: {
        type: String,
        default: 'GMT-04:00'
    },
    playlist: {
        type: Array,
        default: []
    },
    guildId:{
        type: String,
        required: true
    },
});

// This is a model. The model surrounds the schema and provides an
// interface by which to communicate with a database collection.
// String name passed through parameter is important because it will
// puralize it and look for that collection in the database
const Member = mongoose.model('Member', memberSchema);

// Exports module to use elsewhere
module.exports = Member;