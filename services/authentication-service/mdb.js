/* library imports */
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');
const debug = require('debug');
const assert = require('assert');

/* internal imports */
const constants = require('./constants');

/* log function: `DEBUG=mongo:authentication node index.js` */
const log = debug('mongo:authentication');

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
 * Returns true if the user verified their email, false otherwise.
 * 
 * @param {User} user The full document in MongoDB representing a user.
 */
function isVerified(user) {
    return user.email_verified;
}

/**
 * Returns true if the user provided the same password as the one they made during registration.
 * 
 * @param {User} user The full document in MongoDB representing a user.
 * @param {string} password The password the user has provided.
 */
function authenticate(user, password){
    return bcrypt.compareSync(password, user.password);
}

module.exports = {
    getUser: getUser,
    isVerified: isVerified,
    authenticate: authenticate
}