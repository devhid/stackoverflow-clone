/* library imports */
const elasticsearch = require('elasticsearch');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client({
    host: "107.191.43.73:9200"
});

/* index where user account information will be stored */
const INDEX = "users";

/* Checks if a user already exists by checking the 
 * existence of the user's email and username in the database. 
 */
async function userExists(email, username) {
    emailExists = (await client.count({
        index: INDEX,
        body: { query: { match: { "email": email.toLowerCase() } } }
    })).count != 0;

    usernameExists = (await client.count({
        index: INDEX,
        body: { query: { match: { "username": username.toLowerCase() } } }
    })).count != 0;

    return emailExists || usernameExists;
}

/* Index a new user in the database. */
async function addUser(email, username, password) {
    const response = await client.index({
        index: INDEX,
        type: "_doc",
        refresh: "true",
        body: {
            "email": email.toLowerCase(),
            "username": username.toLowerCase(),
            "password": bcrypt.hashSync(password, 10),
            "key": crypto.randomBytes(64).toString('hex'),
            "email_verified": false
        }
    });

    return response;
}

module.exports = {
    userExists: userExists,
    addUser: addUser
};