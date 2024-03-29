/* library imports */
const elasticsearch = require('elasticsearch');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const constants = require('./constants');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client(constants.ELASTICSEARCH_OPTIONS);

/* index where user account information will be stored */
const INDEX = "users";
const KEY_LENGTH = 16;

/* Checks if a user already exists by checking the 
 * existence of the user's email and username in the database. 
 */
async function userExists(email, username) {
    const search = (await client.search({
        index: INDEX,
        body: { query: { match: {"email": email } } }
    })).hits.hits;
    console.log(search);
    const emailExists = (await client.count({
        index: INDEX,
        body: { query: { match: { "email": email } } }
    })).count != 0;

    const usernameExists = (await client.count({
        index: INDEX,
        body: { query: { match: { "username": username } } }
    })).count != 0;

    return emailExists || usernameExists;
}

/* Generate a new random key */
function generateKey() {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(KEY_LENGTH, (err, buffer) => {
            if(err) {
                reject(err);
            } else {
                resolve(buffer.toString('hex'));
            }
        });
    });
}

/* Index a new user in the database. Returns the generated key. */
async function addUser(email, username, password) {
    const key = await generateKey();
    const response = await client.index({
        index: INDEX,
        type: "_doc",
        refresh: "true",
        body: {
            "email": email,
            "username": username,
            "password": bcrypt.hashSync(password, 10),
            "key": key,
            "email_verified": false,
            "reputation": 1
        }
    });

    return key;
}

/* Retrieve the key for a user from the database. */

module.exports = {
    userExists: userExists,
    addUser: addUser
};