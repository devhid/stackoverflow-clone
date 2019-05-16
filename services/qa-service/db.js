/* library imports */
const MongoClient = require('mongodb').MongoClient;
const debug = require('debug');
const assert = require('assert');
const uuidv4 = require('uuid/v4');
const cassandra = require('cassandra-driver');

/* internal imports */
const constants = require('./constants');
const util = require('./util');
const DBResult = require('./dbresult').DBResult;

/* log function: `DEBUG=mongo:qa node index.js` */
const logMongo = debug('mongo:qa');
const logCassandra = debug('cassandra:qa');

/* database reference */
let db = null;

/* connect to mongodb and set reference to database object */
MongoClient.connect(constants.MONGODB_OPTIONS.host, {"useNewUrlParser": true}, function(err, client) {
    if(err) {
        logMongo(`[Error] MongoClient.connect() - ${err}`);
    } else {
        logMongo("Successfully connected.");
        db = client.db(constants.MONGODB_OPTIONS.database);
    }
});

/* connect to cassandra */
const cassandraOptions = constants.CASSANDRA_OPTIONS;
const cassandraClient = new cassandra.Client(cassandraOptions);
cassandraClient.connect()
    .then(() => {
        logCassandra(`Successfully established connection to keyspace, '${cassandraOptions.keyspace}'.`)
    }).catch((error) => {
        logCassandra(`[Error] Could not connect to keyspace, '${cassandraOptions.keyspace}'.`);
        logCassandra(`[Error] cassandraClient.connect() - ${error}`)
    });

/**
 * Closes cassandra connection.
 */
function closeCassandra() {
    cassandraClient.shutdown();
}

async function addQuestion() {

}

async function getQuestion() {

}

async function deleteQuestion() {

}

async function addAnswer() {

}

async function getAnswers() {

}

async function upvoteQuestion() {

}

async function upvoteAnswer() {

}

async function acceptAnswer() {

}

/******* Helper Functions *******/

/**
 * Returns true if the specified poster has actually uploaded all of the specified media IDs, otherwise false.
 * 
 * @param {string[]} media_ids A JavaScript array of media IDs.
 * @param {string} poster The user who is providing these media IDs.
 */
async function checkMediaAuthenticity(media_ids, poster) {

}

/**
 * Returns true if the media IDs are not used in any other question or answer, otherwise false.
 * 
 * @param {string[]} media_ids A JavaScript array of media IDs.
 */
async function checkMediaAvailablity(media_ids) {

}

/**
 * Returns a JavaScript array of media IDs all associated with the question and its answers.
 * 
 * @param {string} qid The id of a question.
 */
async function getAssociatedMedia(qid) {

}

/**
 * Deletes all media documents associated with the media IDs from Cassandra and MongoDB.
 * 
 * @param {string[]} media_ids 
 */
async function deleteMedia(media_ids) {

}

/**
 * Returns true if the user has not already contributed to the view count of a question.
 *      If a username is provided, this function will check if is already included
 *      in its view count.
 * 
 *      If the ip is provided, this function will check if is already included
 *      in its view count.
 * 
 *      Both username and ip cannot be provided and both cannot be null.
 *      Otherwise, this function will throw an Error.
 * 
 * 
 * @param {string} username The username of the user if authenticated, or null if an ip is provided.
 * @param {string} ip The IP address of the user is unauthenticated, or null if a username is provided.
 */
function checkUniqueView(qid, username, ip) {

}

/**
 * Increments view count for a question by one.
 * 
 * @param {string} qid The id of the question.
 */
async function incrementViewCount(qid) {

}


module.exports = {
    closeCassandra: closeCassandra
}