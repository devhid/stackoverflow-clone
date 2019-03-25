/* library imports */
const elasticsearch = require('elasticsearch');

const constants = require('./constants');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client({
    host: "http://admin:ferdman123@107.191.43.73:92"
});

const INDEX_QUESTIONS = "questions";  // INDEX_QUESTIONS is where questions are stored
const INDEX_VIEWS = "views";          // INDEX_VIEWS is where views for a question are stored
const INDEX_ANSWERS = "answers";      // INDEX_ANSWERS is where answers are stored

async function addQuestion(user, title, body, tags, media){
    media = (media == undefined) ? [] : media;
    let response = await client.index({
        index: INDEX_QUESTIONS,
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
            "timestamp": Math.round(Date.now()/1000),
            "media": media,
            "tags": tags,
            "accepted_answer_id": null
        }
    });
    let viewResponse = await client.index({
        index: INDEX_VIEWS,
        type: "_doc",
        refresh: "true",
        body: {
            "qid": response._id,
            "authenticated": [],
            "unauthenticated": []
        }
    });
    console.log(viewResponse);
    return response._id;
}

async function updateViewCount(qid, user, ip){
    // grab the document representing the views for the question
    let question_view = (await client.search({
        index: INDEX_VIEWS,
        body: {
            query: {
                // match_all: {}
                term: {
                    "qid": qid
                }
            }
        }
    })).hits.hits[0];

    if (question_view == undefined)
        return false;

    // check whether or not we increment by username or IP address
    let update = true;

    if (user == undefined){
        // unique per IP address
        let ips = question_view._source.unauthenticated;
        if (ips.includes(ip))
            update = false;
        else {
            // update the array of unauthenticated views by IP address
            const updateViewResponse = await client.updateByQuery({
                index: INDEX_VIEWS,
                type: "_doc",
                refresh: "true",
                body: { 
                    query: { 
                        term: { 
                            "qid": qid
                        } 
                    }, 
                    script: {
                        lang: "painless",
                        inline: "ctx._source.unauthenticated.add(params.newIP)",
                        params: {
                            "newIP": ip
                        }
                    }
                }
            });
        }
    }
    else {
        // unique per username
        let users = question_view._source.authenticated;
        if (users.includes(user))
            update = false;
        else {
            // update the array of authenticated views by username
            const updateViewResponse = await client.updateByQuery({
                index: INDEX_VIEWS,
                type: "_doc",
                refresh: "true",
                body: { 
                    query: { 
                        term: { 
                            "qid": qid
                        } 
                    }, 
                    script: {
                        lang: "painless",
                        inline: "ctx._source.authenticated.add(params.newUser)",
                        params: {
                            "newUser": user
                        }
                    }
                }
            });
        }
    }

    // perform the update if necessary
    if (update){
        const updateResponse = await client.updateByQuery({
            index: INDEX_QUESTIONS,
            type: "_doc",
            refresh: "true",
            body: { 
                query: { 
                    term: { 
                        "_id": qid
                    } 
                }, 
                script: { 
                    inline: "ctx._source.view_count += 1" 
                } 
            }
        });
    }
    
    // return the question
    return await client.get({
        index: INDEX_QUESTIONS,
        type: "_doc",
        id: qid
    });
}

async function getQuestion(qid, user, ip, update){
    let question = null;
    if (update){
        question = updateViewCount(qid, user, ip);
    }
    // if updateViewCount returned false, the QID is invalid
    //      do not try to search again
    if (question === null){
        question = await client.get({
            index: INDEX_QUESTIONS,
            type: "_doc",
            id: qid
        });
    }
    return question;
}

async function deleteQuestion(qid, user){
    const question = await getQuestion(qid, user);
    let response = null;
    if (!question)
        return response;
    if (user._source.username == question._source.user.username){
        response = await client.delete({
            index: INDEX_QUESTIONS,
            type: "_doc",
            id: qid
        });
    }
    else
        response = false;
    return response;
}

async function addAnswer(qid, user, body, media){
    media = (media == undefined) ? [] : media;
    console.log(qid);
    console.log(user);
    console.log(body);
    console.log(media);
    
    let response = await client.index({
        index: INDEX_ANSWERS,
        type: "_doc",
        refresh: "true",
        body: {
            "qid": qid,
            "user": user,
            "body": body,
            "score": 0,
            "is_accepted": false,
            "timestamp": Math.round(Date.now()/1000),
            "media": media
        }
    });
    return response;
}

async function getAnswers(qid){
    let answers = (await client.search({
        index: INDEX_ANSWERS,
        body: {
            query: {
                term: {
                    "qid": qid
                }
            }
        }
    })).hits.hits;//['hits']['hits'];

    if (answers.length == 0)
        return undefined

    var transformedAnswers = [];
    for (var i in answers){
        let ans = answers[i];
        ans._source[constants.ID_KEY] = ans._id;
        ans = ans._source;
        delete ans.qid;
        transformedAnswers.push(ans);
    }
    return transformedAnswers;
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