const mongoose = require('mongoose');
require('dotenv').config();

module.exports = {
    init: async () => {
        const dbOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            autoIndex: true,
            connectTimeoutMS: 10000,
            family: 4
        };

        // TODO: Make sure you add the correct url to connect to your Mongo database with cluster(s)
        const MONGO_DB_URL = '<add your MongoDB URL here>';
        mongoose.connect(MONGO_DB_URL, dbOptions);
        mongoose.Promise = global.Promise;

        mongoose.connection.on('connected', () => {
            console.log('Bot successfully connected to database');
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Bot disconnected from database');
        });

        mongoose.connection.on('err', () => {
            console.log('Error connecting to database: ' + err);
        });
    }
}