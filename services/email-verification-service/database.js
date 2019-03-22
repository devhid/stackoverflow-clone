/* library imports */
const elasticsearch = require('elasticsearch');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client({
    host: "107.191.43.73:9200"
});

/* index where user account information will be stored */
const INDEX = "users";

async function verifyEmail(email, key) {
    let verified = await verify(email, key);
    if(verified) {
        updateVerified(email);
        return true
    }
    return false;
}
async function verify(email, key) {
    let user = (await client.search({
        index: INDEX,
        body: { query: { match: {"email": email.toLowerCase() } } }
    }))['hits']['hits'][0];

    return user._source.key == key;
}

async function updateVerified(email) {
    const response = await client.updateByQuery({
        index: INDEX,
        type: "_doc",
        refresh: "true",
        body: { 
            query: { 
                match: { 
                    "email": email.toLowerCase() 
                } 
            }, 
            script: { 
                inline: "ctx._source.email_verified = true" 
            } 
        }
    });

    return response;
}

async function emailExists(email) {
    let emailExists = (await client.count({
        index: INDEX,
        body: { query: { match: { "email": email.toLowerCase() } } }
    })).count != 0

    return emailExists;
}

async function isVerified(email) {
    let user = (await client.search({
        index: INDEX,
        body: { query: { match: { "email": email.toLowerCase() } } }
    }))['hits']['hits'][0];

    return user._source.email_verified;
}

module.exports = {
    emailExists: emailExists,
    isVerified: isVerified,
    verifyEmail: verifyEmail
};