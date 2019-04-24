const chakram = require('chakram');
const constants = require('./constants');

function clear(indices, callback) {
    for(var index of indices) {
        chakram.post(`http://${constants.ELASTICSEARCH_IP}/${index}/_delete_by_query`, { "query": { "match_all": {} } });
    }

    callback();
}

function clearAll(callback) {
    clear(["users", "questions", "answers", "views", "q-upvotes", "a-downvotes"], callback);
}

module.exports = {
    clear: clear,
    clearAll: clearAll
}