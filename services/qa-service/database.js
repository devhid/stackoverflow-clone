/* library imports */
const elasticsearch = require('elasticsearch');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client({
    host: "http://admin:ferdman123@107.191.43.73:92"
});

const INDEX_MAIN = "qa";            // INDEX_MAIN is where questions and answers are stored
const INDEX_VIEWS = "qa-views";     // INDEX_VIEWS is where views for a question are stored

async function addQuestion(user, title, body, tags, media){
    media = (media == undefined) ? [] : media;
    let response = await client.index({
        index: INDEX_MAIN,
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
            "answers": [],
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
    return response._id;
}

async function updateViewCount(qid, user, ip){
    // grab the document representing the views for the question
    let question_view = await client.search({
        index: INDEX_VIEWS,
        body: {
            query: {
                term: {
                    "qid": qid
                }
            }
        }
    })['hits']['hits'][0];

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
                        inline: "ctx._source.unauthenticated.push(ip)" 
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
                        inline: "ctx._source.authenticated.push(user)" 
                    } 
                }
            });
        }
    }

    // perform the update if necessary
    if (update){
        const updateResponse = await client.updateByQuery({
            index: INDEX_MAIN,
            type: "_doc",
            refresh: "true",
            body: { 
                query: { 
                    term: { 
                        "id": id
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
        index: INDEX_MAIN,
        type: "_doc",
        id: id
    });
}

async function getQuestion(qid, user, ip, update){
    let question = null;
    if (update){
        question = updateViewCount(qid, user, ip);
    }
    if (question == null){
        question = await client.get({
            index: INDEX_MAIN,
            type: "_doc",
            id: qid
        });
    }
    return question;
}

async function deleteQuestion(qid, user){
    const question = await getQuestion(qid, user);
    let response = null;
    if (user._source.username == question._source.user.username){
        response = await client.delete({
            index: INDEX_MAIN,
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
    let response = await client.index({
        index: INDEX_MAIN,
        type: "_doc",
        refresh: "true",
        body: {
            "qid": qid,
            "user": user._source.username,
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
    const answers = await client.search({
        index: INDEX_MAIN,
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