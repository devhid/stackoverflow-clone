/* library imports */
const elasticsearch = require('elasticsearch');
const bcrypt = require('bcrypt');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client({
    host: "http://admin:ferdman123@107.191.43.73:92"
});

/* index where user account information will be stored */
const INDEX = "users";

async function userExists(username) {
    const usernameExists = (await client.count({
        index: INDEX,
        body: { query: { term: { "username": username.toLowerCase() } } }
    })).count != 0;
    
    return usernameExists;
}

async function canLogin(username) {
    const user = (await client.search({
        index: INDEX,
        body: { query: { term: {"username": username.toLowerCase() } } }
    }))['hits']['hits'][0];

    return user._source.email_verified;
}

async function authenticate(username, password) {
    const user = (await client.search({
        index: INDEX,
        body: { query: { term: {"username": username.toLowerCase() } } }
    }))['hits']['hits'][0];

    return bcrypt.compareSync(password, user._source.password);
}

module.exports = {
    userExists: userExists,
    canLogin: canLogin,
    authenticate, authenticate
}