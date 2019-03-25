/* library imports */
const elasticsearch = require('elasticsearch');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client({
    host: "http://admin:ferdman123@107.191.43.73:92"
});

/* index where questions and answers will be stored */
const INDEX = "qa";

async function addQuestion(user, title, body, tags, media){
    media = (media == undefined) ? [] : media;
    let response = await client.index({
        index: INDEX,
        type: "_doc",
        refresh: "true",
        body: {
            "user": {
                "username": user._source.username,
                "reputation": user._source.reputation
            },
            "title": title,
            "body": body,
            "score": 0,
            "view_count": 0,
            "answer_count": 0,
            "timestamp": Date.now()/1000,
            "media": media,
            "tags": tags,
            "answers": [],
            "accepted_answer_id": null
        }
    });
    return response._id;
}

async function getQuestion(id){
    const question = await client.get({
        index: INDEX,
        type: "_doc",
        id: id
    });
    return question;
}

async function deleteQuestion(user, id){
    const question = await getQuestion(id);
    let response = null;
    if (user._source.username == question._source.user.username){
        response = await client.delete({
            index: INDEX,
            type: "_doc",
            id: id
        });
    }
    else
        response = false;
    return response;
}

async function addAnswer(qid, user, body, media){
    media = (media == undefined) ? [] : media;
    let response = await client.index({
        index: INDEX,
        type: "_doc",
        refresh: "true",
        body: {
            "qid": qid,
            "user": user._id,
            "body": body,
            "score": 0,
            "is_accepted": false,
            "timestamp": Date.now()/1000,
            "media": media
        }
    });
    return response;
}

async function getAnswers(qid){
    const answers = await client.search({
        index: INDEX,
        body: {
            query: {
                term: {
                    "qid": qid
                }
            }
        }
    })['hits']['hits'];
    return answers;
}

/** MILESTONE 3 */
async function upvoteQuestion(id){

}

async function upvoteAnswer(aid){

}

async function acceptAnswer(aid){

}

module.exports = {
    addQuestion: addQuestion,
    getQuestion: getQuestion,
    deleteQuestion: deleteQuestion,
    addAnswer: addAnswer,
    getAnswers: getAnswers,
    upvoteQuestion: upvoteQuestion,
    upvoteAnswer: upvoteAnswer,
    acceptAnswer: acceptAnswer
};