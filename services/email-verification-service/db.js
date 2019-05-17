/* library imports */
const MongoClient = require('mongodb').MongoClient;
const debug = require('debug');
const assert = require('assert');

/* internal imports */
const constants = require('./constants');

/* log function: `DEBUG=mongo:email-verification node index.js` */
const log = debug('mongo:email-verification');

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
 * Returns true if the user's verification key matches the one stored in the database or the backdoor key.
 * 
 * @param {User} user The full document in MongoDB representing a user.
 * @param {string} key A verification key that the user is providing to verify their email.
 */
function matchesKey(user, key) {
    return user.key == key || key == BACKDOOR_KEY;
}

/**
 * Returns true if the user verified their email, false otherwise.
 * 
 * @param {User} user The full document in MongoDB representing a user.
 */
function isVerified(user) {
    return user.email_verified;
}

/**
 * Updates a user's record to account for a verified email.
 * 
 * @param {string} email The email of the user.
 */
async function updateVerified(email) {
    assert.notEqual(db, null);
    assert.notEqual(email, undefined);

    try {
        const result = await db.collection(constants.COLLECTIONS.USERS).updateOne({"email": email}, {$set: {"email_verified": true}});
        log(`updateVerified() - ${result}`);
    } catch(err) {
        log(`[Error] updateVerified() - ${err}`);
    }
}

module.exports = {
    getUser: getUser,
    matchesKey: matchesKey,
    isVerified: isVerified,
    updateVerified: updateVerified
};