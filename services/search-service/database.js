/* library imports */
const elasticsearch = require('elasticsearch');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client({
    host: "http://admin:ferdman123@107.191.43.73:92"
});

/* index where user account information will be stored */
const INDEX = "questions";

async function searchQuestions(timestamp, limit, accepted) {
    let body = {
        query: {
            range: {
                "timestamp": {
                    "lte": timestamp
                }
            }
        },
        sort: {
            "timestamp": {
                 "order": "desc"
            }
        }
    };

    if(accepted) {
        body['query']['term'] = {
            "accepted": true
        }
    }

    const results = (await client.search({
        index: INDEX,
        size: limit,
        body: body
    }))['hits']['hits'];

    var transformedResults = [];
    for (var i in results){
        let q = results[i];
        q._source['media'] = (q._source['media'].length == 0) ? null : q._source['media'];
        transformedResults.push(q._source);
    }

    return transformedResults;
}

module.exports = {
    searchQuestions: searchQuestions
};