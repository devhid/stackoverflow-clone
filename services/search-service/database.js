/* library imports */
const elasticsearch = require('elasticsearch');
const constants = require('./constants');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client(constants.ELASTICSEARCH_OPTIONS);

/* index where user account information will be stored */
const INDEX = "questions";

async function searchQuestions(timestamp, limit, q, sort_by, tags, has_media, accepted) {
    let body = { query: { bool: { must: [] } } };
    
    if(timestamp) {
        body["query"]["bool"]["must"].push({
            range: {
                "timestamp": {
                    "lte": timestamp
                }
            }
        });
    }

    if(q) {
        body["query"]["bool"]["must"].push({
            "multi_match": {
                "query": q,
                "fields": ["title", "body"]
            }
        });
    }

    if(sort_by) {
        body["sort"] = {
            [sort_by]: {
                "order": "desc"
            }
        }
    }

    if(tags.length > 0) {
        body["query"]["bool"]["must"].push({
            'terms_set': {
                'tags': {
                    "terms": tags,
                    'minimum_should_match_script': {
                        "source": "params.num_terms"
                    }
                }   
            }
        });
    }

    if(has_media) {
        body["query"]["bool"]["must"].push({
            'exists' : {
                "field": "media"
            }
        });
    }

    if(accepted) {
        body["query"]["bool"]["must"].push({
            'exists' : {
                "field": "accepted_answer_id"
            }
        });
    }

    const results = (await client.search({
        index: INDEX,
        size: limit,
        body: body
    }))['hits']['hits'];

    var transformedResults = [];
    for (var i in results){
        let q = results[i];
        q._source['id'] = q._id;
        q._source['media'] = (q._source['media'].length == 0) ? null : q._source['media'];
        transformedResults.push(q._source);
    }

    return transformedResults;
}

module.exports = {
    searchQuestions: searchQuestions
};