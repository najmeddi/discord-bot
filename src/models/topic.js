const mongoose = require('mongoose');

// Schema will define the structure of the documents that will
// be later stored inside a collection
const Schema = mongoose.Schema;     // Constructor function

// Creates new instance of schema object
// Describes the structure of what is to be stored
const topicSchema = new Schema({
    topicAuthor:{
        type: Object,
        required: true
    },
    topicDescription: {
        // Cruly brackets allow to add options
        type: String,
        required: true,

    },
    guildId:{
        type: String,
        required: true
    },
    date: { type: Date, default: Date.now }
});

// This is a model. The model surrounds the schema and provides an
// interface by which to communicate with a database collection.
// String name passed through parameter is important because it will
// puralize it and look for that collection in the database
const Topic = mongoose.model('Topic', topicSchema);

// Exports module to use elsewhere
module.exports = Topic;