/* library imports */
const MongoClient = require('mongodb').MongoClient;
const debug = require('debug');
const assert = require('assert');

/* internal imports */
const constants = require('./constants');

/* log function: `DEBUG=mongo:registration node index.js` */
const log = debug('mongo:user');

/* database reference */
let db = null;

/* connect to mongodb and set reference to database object */
MongoClient.connect(constants.MONGODB_OPTIONS.host, {"useNewUrlParser": true}, function(err, client) {
    if(err) {
        log(`[Error] MongoClient.connect() - ${err}`);
    } else {
        log("Successfully connected.");
        db = client.db(constants.MONGODB_OPTIONS.database);
    }
});

/**
 * Returns the full document representing a user specified by the username, otherwise null.
 * 
 * @param {string} username The username of the user.
 */
async function getUser(username) {
    assert.notEqual(db, null);
    assert.notEqual(username, undefined);

    try {
        var user = await db.collection(constants.COLLECTIONS.USERS).findOne({"username": username});
        log(`getUser() - ${user}`);
    } catch(err) {
        log(`[Error] getUser() - ${err}`);
    }
    
    return user;
}

/**
 * Returns all the questions posted by a user with the specified username.
 * 
 * @param {string} username 
 */
async function getUserQuestions(username) {
    assert.notEqual(db, null);
    assert.notEqual(username, undefined);

    try {
        const questions = await db.collection(constants.COLLECTIONS.QUESTIONS).find({'user': username}).toArray();
        log(`getUserQuestions() - ${questions}`);

        var qids = [];
        for(let question of questions) {
            qids.push(question.id);
        }
        
    } catch(err) {
        log(`[Error] getUserQuestions() - ${err}`);
    }

    return qids;
}

/**
 * Returns all the answers posted by a user with the specified username.
 * 
 * @param {string} username 
 */
async function getUserAnswers(username) {
    assert.notEqual(db, null);
    assert.notEqual(username, undefined);

    try {
        const answers = await db.collection(constants.COLLECTIONS.ANSWERS).find({'user': username}).toArray();
        log(`getUserAnswers() - ${answers}`);

        var aids = [];
        for(let answer of answers) {
            aids.push(answer.id);
        }
        
    } catch(err) {
        log(`[Error] getUserQuestions() - ${err}`);
    }

    return aids;
}

module.exports = {
    getUser: getUser,
    getUserQuestions: getUserQuestions,
    getUserAnswers: getUserAnswers
}