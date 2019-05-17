/* library imports */
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const debug = require('debug');
const assert = require('assert');

/* internal imports */
const constants = require('./constants');

/* log function: `DEBUG=mongo:registration node index.js` */
const log = debug('mongo:registration');

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
 * Returns true if a user already exists with the specified username or email, else false.
 * 
 * @param {string} email The email of the user.
 * @param {string} username The username of the user.
 */
async function userExists(email, username) {
    assert.notEqual(db, null);
    assert.notEqual(email, undefined);
    assert.notEqual(username, undefined);

    let emailExists = await db.collection(constants.COLLECTIONS.USERS).countDocuments(query={"email": email}, options={"limit": 1});
    let usernameExists = await db.collection(constants.COLLECTIONS.USERS).countDocuments(query={"username": username}, options={"limit": 1});

    return emailExists || usernameExists;
}

/**
 * Registers a user into the database and returns the generated key.
 * 
 * @param {string} email The email of the user.
 * @param {string} username The username of the user.
 * @param {string} password The password of the user.
 */
async function addUser(email, username, password) {
    assert.notEqual(db, null);
    assert.notEqual(username, undefined);
    assert.notEqual(email, undefined);
    assert.notEqual(password, undefined);

    const key = await generateKey();

    const user = {
        "email": email,
        "username": username,
        "password": bcrypt.hashSync(password, 10),
        "key": key,
        "email_verified": false,
        "reputation": 1
    };

    try {
        const response = await db.collection(constants.COLLECTIONS.USERS).insertOne(user);
        log(response);
    } catch(err) {
        log(`[Error] addUser() - ${err}`);
    }

    return key;
}

/***
 * Generates a random key of KEY_LENGTH bytes for email verification.
 */
function generateKey() {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(constants.KEY_LENGTH, (err, buffer) => {
            if(err) {
                log(`[Error] generateKey() - ${err}`);
                reject(err);
            } else {
                resolve(buffer.toString('hex'));
            }
        });
    });
}

module.exports = {
    userExists: userExists,
    addUser: addUser
}