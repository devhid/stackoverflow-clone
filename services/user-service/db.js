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

    return new Promise( (resolve, reject) => {
        db.collection(constants.COLLECTIONS.USERS).findOne({"username": username}, function(err, result) {
            if(err) {
                log(`[Error] getUser() - ${err}`);
                reject(err);
            } else {
                log(`getUser() - ${result}`);
                resolve(result);
            }
        });
    });
}

/**
 * Returns all the questions posted by a user with the specified username.
 * 
 * @param {string} username 
 */
async function getUserQuestions(username) {
    assert.notEqual(db, null);
    assert.notEqual(username, undefined);

    return new Promise((resolve, reject) => {
        db.collection(constants.COLLECTIONS.QUESTIONS).find({'user.username': username}).toArray(function(err, result) {
            if(err) {
                log(`[Error] getUserQuestions() - ${err}`);
                reject(err);
            } else {
                log(`getUserQuestions() - ${result}`);

                let qids = [];
                for(let question of result) {
                    qids.push(question.id);
                }
                
                resolve(qids);
            }
        })
    });
}

/**
 * Returns all the answers posted by a user with the specified username.
 * 
 * @param {string} username 
 */
async function getUserAnswers(username) {
    assert.notEqual(db, null);
    assert.notEqual(username, undefined);

    return new Promise((resolve, reject) => {
        db.collection(constants.COLLECTIONS.ANSWERS).find({'user': username}).toArray(function(err, result) {
            if(err) {
                log(`[Error] getUserQuestions() - ${err}`);
                reject(err);
            } else {
                log(`getUserQuestions() - ${result}`);

                let aids = [];
                for(let answer of result) {
                    aids.push(answer.id);
                }
                
                resolve(aids);
            }
        })
    });
}

module.exports = {
    getUser: getUser,
    getUserQuestions: getUserQuestions,
    getUserAnswers: getUserAnswers
}