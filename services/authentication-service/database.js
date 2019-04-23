/* library imports */
const elasticsearch = require('elasticsearch');
const bcrypt = require('bcrypt');
const constants = require('./constants');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client(constants.ELASTICSEARCH_OPTIONS);

/* index where user account information will be stored */
const INDEX = "users";

async function getUser(username) {
    const results = (await client.search({
        index: INDEX,
        body: { query: { match: { "username": username } } }
    }))['hits']['hits'];

    return results ? results[0] : null;
}

async function userExists(username) {
    const usernameExists = (await client.count({
        index: INDEX,
        body: { query: { match: { "username": username } } }
    })).count != 0;
    
    return usernameExists;
}

async function canLogin(username) {
    const user = (await client.search({
        index: INDEX,
        body: { query: { match: {"username": username } } }
    }))['hits']['hits'][0];

    return user._source.email_verified;
}

async function authenticate(username, password) {
    const user = (await client.search({
        index: INDEX,
        body: { query: { match: {"username": username } } }
    }))['hits']['hits'][0];

    return bcrypt.compareSync(password, user._source.password);
}

module.exports = {
    getUser: getUser,
    userExists: userExists,
    canLogin: canLogin,
    authenticate, authenticate
}