/* library imports */
const elasticsearch = require('elasticsearch');
const constants = require('./constants');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client(constants.ELASTICSEARCH_OPTIONS);

/* index where user account information will be stored */
const INDEX = "users";

/* backdoor key */
const BACKDOOR_KEY = "abracadabra"

// async function verifyEmail(user, key) {
//     const verified = verify(user, key);
//     if(verified) {
//         updateVerified(user);
//         return true
//     }
//     return false;
// }
// async function verify(email, key) {
//     const user = (await client.search({
//         index: INDEX,
//         body: { query: { match: {"email": email } } }
//     }))['hits']['hits'][0];

//     return user._source.key == key || key == BACKDOOR_KEY;
// }

function updateVerified(email) {
    client.updateByQuery({
        index: INDEX,
        type: "_doc",
        refresh: "true",
        body: { 
            query: { 
                match: { 
                    "email": email
                } 
            }, 
            script: { 
                inline: "ctx._source.email_verified = true" 
            } 
        }
    });
}

async function emailExists(email) {
    const emailExists = (await client.count({
        index: INDEX,
        body: { query: { match: { "email": email } } }
    })).count != 0;

    return emailExists;
}

// async function isVerified(email) {
//     const user = (await client.search({
//         index: INDEX,
//         body: { query: { match: { "email": email } } }
//     }))['hits']['hits'][0];

//     return user._source.email_verified;
// }

function matchesKey(user, key) {
    return user._source.key == key || key == BACKDOOR_KEY;
}

function isVerified(user) {
    return user._source.email_verified;
}

async function getUser(email) {
    const users = (await client.search({
        index: INDEX,
        body: { query: { match: { "email": email } } }
    }))['hits']['hits'];

    return (users.length == 0) ? null : users[0];
}

module.exports = {
    getUser: getUser,
    matchesKey: matchesKey,
    isVerified: isVerified,
    updateVerified: updateVerified
};