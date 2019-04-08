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
const INDEX_Q_UPVOTES = "q-upvotes";  // INDEX_Q_UPVOTES is where question upvotes are stored
const INDEX_A_UPVOTES = "a-upvotes";  // INDEX_A_UPVOTES is where answer upvotes are stored

/* milestone 1 */

/** POST /questions/add
 * Adds a Question to the ElasticSearch storage.
 * @param {ElasticSearch user} user the user object returned by ElasticSearch
 * @param {string} title the title of the question
 * @param {string} body the body of the question
 * @param {string[]} tags the tags of the question
 * @param {id[]} media the ids of any attached media
 */
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
            "timestamp": Date.now()/1000,
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
    let upvoteResponse = await client.index({
        index: INDEX_Q_UPVOTES,
        type: "_doc",
        refresh: "true",
        body: {
            "qid": response._id,
            "upvotes": [],
            "downvotes": []
        }
    });
    return (response == null) ? response : response._id;
}

/** GET /questions/:qid
 * Updates the view count for the specified Question based on a username or IP address.
 * @param {string} qid the _id of the question
 * @param {string} username the username for which to update the view count
 * @param {string} ip the IP address for which to update the view count
 */
async function updateViewCount(qid, username, ip){
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
        return undefined;

    // check whether or not we increment by username or IP address
    let update = true;

    if (username == undefined){
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
                            "newUser": username
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

/** GET /questions/:qid
 * Retrieves the specified Question and may update its view count depending on arugments.
 * @param {string} qid the _id of the question
 * @param {string} username the username for which to update the view count if specified
 * @param {string} ip the IP address for which to update the view count if specified
 * @param {boolean} update whether or not to update the view count of the question
 */
async function getQuestion(qid, username, ip, update){
    let question = null;
    if (update){
        question = updateViewCount(qid, username, ip);
    }
    // if update:
    //      if updateViewCount returned undefined, question could not be found
    //          no need to searcha again
    //      if updateViewCount returned a response, question will not be null
    //  else:
    //      try searching for the question
    if (question === null){
        question = await client.get({
            index: INDEX_QUESTIONS,
            type: "_doc",
            id: qid
        });
        question = (!question) ? undefined: question;
    }

    // question === undefined if it could not be found
    return question;
}

/** POST /questions/:qid/answers/add
 * Adds an Answer to the specified Question.
 * @param {string} qid the _id of the question
 * @param {string} username the username posting the answer
 * @param {string} body the body of the answer
 * @param {id[]} media array of media IDs attached to the answer
 */
async function addAnswer(qid, username, body, media){
    media = (media == undefined) ? [] : media;
    
    let response = await client.index({
        index: INDEX_ANSWERS,
        type: "_doc",
        refresh: "true",
        body: {
            "qid": qid,
            "user": username,
            "body": body,
            "score": 0,
            "is_accepted": false,
            "timestamp": Date.now()/1000,
            "media": media
        }
    });
    let upvoteResponse = await client.index({
        index: INDEX_A_UPVOTES,
        type: "_doc",
        refresh: "true",
        body: {
            "aid": response._id,
            "upvotes": [],
            "downvotes": []
        }
    });
    return response._id;
}

/** GET /questions/:qid/answers
 * Retrieves all Answers for the specified Question.
 * @param {string} qid the _id of the question
 */
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

/* milestone 2 */

/**
 * Deletes the specified Question if it belongs to the right user.
 * @param {string} qid the _id of the question
 * @param {string} username the user who originally posted the question
 */
async function deleteQuestion(qid, username){
    const question = await getQuestion(qid, username);
    let response = undefined;
    if (!question)
        return response;
    if (username == question._source.user.username){
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

/* milestone 3 */

/** helper for POST /questions/:qid/upvote and POST /answers/:aid/upvote
 * Undoes a user's vote for a specified Question or Answer.
 * @param {string} qid the _id of the question (if used for undoing the vote to a question)
 * @param {string} aid the _id of the answer (if used for undoing the vote to an answer)
 * @param {string} username the user who wishes to undo his vote for the question/answer
 * @param {boolean} upvote whether the user's vote is in upvotes or downvotes
 */
async function undoVote(qid, aid, username, upvote){
    let which_index = (aid == undefined) ? INDEX_Q_UPVOTES : INDEX_A_UPVOTES;
    let which_id = (aid == undefined) ? "qid" : "aid";
    let which_id_value = (aid == undefined) ? qid : aid;
    let arr = (upvote) ? "upvotes" : "downvotes";
    let param_user = "user";
    let inline_script = `ctx._source.${arr}.remove(ctx._source.${arr}.indexOf(params.${param_user}))`
    const undoVoteResponse = await client.updateByQuery({
        index: which_index,
        type: "_doc",
        refresh: "true",
        body: { 
            query: { 
                term: { 
                    [which_id]: which_id_value
                } 
            }, 
            script: {
                lang: "painless",
                inline: inline_script,
                params: {
                    [param_user]: username
                }
            }
        }
    });
    return undoVoteResponse;
}

/** helper for POST /questions/:qid/upvote and POST /answers/:aid/upvote
 * Adds a user's vote to the specified Question or Answer.
 * @param {string} qid the _id of the question (if used for adding the vote to a question)
 * @param {string} aid the _id of the answer (if used for adding the vote to an answer)
 * @param {string} username the user who wishes to add his vote for the question/answer
 * @param {boolean} upvote whether the user's vote is to upvote or downvote
 */
async function addVote(qid, aid, username, upvote){
    let which_index = (aid == undefined) ? INDEX_Q_UPVOTES : INDEX_A_UPVOTES;
    let which_id = (aid == undefined) ? "qid" : "aid";
    let which_id_value = (aid == undefined) ? qid : aid;
    let arr = (upvote) ? "upvotes" : "downvotes";
    let param_user = "user";
    let inline_script = `ctx._source.${arr}.add(${param_user})`
    const addVoteResponse = await client.updateByQuery({
        index: which_index,
        type: "_doc",
        refresh: "true",
        body: { 
            query: { 
                term: { 
                    [which_id]: which_id_value
                } 
            }, 
            script: {
                lang: "painless",
                inline: inline_script,
                params: {
                    [param_user]: username
                }
            }
        }
    });
    return addVoteResponse;
}

/** helper for POST /questions/:qid/upvote and POST /answers/:aid/upvote
 * Updates the score of a specified Question or Answer by the amount.
 * @param {string} qid the _id of the question (if used for updating the score of a question)
 * @param {string} aid the _id of the answer (if used for updating the score of an answer)
 * @param {integer} amount the amount by which to add to the current score of the question or answer
 */
async function updateScore(qid, aid, amount){
    let which_index = (aid == undefined) ? INDEX_Q_UPVOTES : INDEX_A_UPVOTES;
    let which_id = (aid == undefined) ? "qid" : "aid";
    let which_id_value = (aid == undefined) ? qid : aid;
    let param_amount = "amount";
    let inline_script = `ctx._source.score += params.${param_amount}`
    const updateResponse = await client.updateByQuery({
        index: which_index,
        type: "_doc",
        refresh: "true",
        body: { 
            query: { 
                term: { 
                    [which_id]: which_id_value
                } 
            }, 
            script: { 
                lang: "painless",
                inline: inline_script,
                params: {
                    [param_amount]: amount
                }
            } 
        }
    });
    return updateResponse;
}

/**
 * Up/downvotes the specified Question or Answer according to the user.
 * @param {string} qid the _id of the question (if used for adding the vote to a question)
 * @param {string} aid the _id of the answer (if used for adding the vote to an answer)
 * @param {string} username the user who wishes to add his vote for the question/answer
 * @param {boolean} upvote whether the user's vote is to upvote or downvote
 */
async function upvoteQA(qid, aid, username, upvote){
    // get the document storing the upvotes and downvotes of the question or answer
    let which_index = (aid == undefined) ? INDEX_Q_UPVOTES : INDEX_A_UPVOTES;
    let which_id = (aid == undefined) ? "qid" : "aid";
    let which_id_value = (aid == undefined) ? qid : aid;
    let qa_votes = (await client.search({
        index: which_index,
        body: {
            query: {
                term: {
                    [which_id]: which_id_value
                }
            }
        }
    })).hits.hits[0];

    // if it could not be found, the question does not exist
    if (qa_votes == undefined)
        return undefined;

    // check if the user downvoted or upvoted the question
    let score_diff = 0;
    let upvoted = qa_votes.upvotes.includes(username);
    let downvoted  = qa_votes.downvotes.includes(username);

    // if the user already voted, undo the vote
    if (upvoted || downvoted){
        let in_upvotes = (upvoted) ? true : false;
        // if upvoted, then we "undo" the upvote by subtracting 1 from the score
        //  else, we "undo" the downvote by adding 1 to the score
        score_diff = (upvoted) ? -1 : 1;
        let undoVoteResp = await undoVote(qid, aid, username, in_upvotes);
        console.log(undoVoteResp);
    }

    // if the user wishes to UPVOTE but DOWNVOTED, we must add the UPVOTE
    if (upvote && downvoted){
        score_diff += 1;
        let addVoteResp = await addVote(qid, aid, username, upvote);
        console.log(addVoteResp);
    }
    // if the user wishes to DOWNVOTE but UPVOTED, we must add the DOWNVOTE
    else if (!upvote && upvoted){
        score_diff -= 1;
        let addVoteResp = await addVote(qid, aid, username, upvote);
        console.log(addVoteResp);
    }

    // update the score of the question or answer
    let updateResp = await updateScore(qid, aid, score_diff);
    return updateResp;
}

/** POST /questions/:qid/upvote
 * Up/downvotes the specified Question according to the user.
 *      If the user has already 'upvoted' the question and it is the same operation, it will be undone.
 *      If the user chooses the opposite of what was previously selected, it will overwrite it.
 * @param {string} qid the _id of the question
 * @param {string} username the user who wishes to 'upvote' the question
 * @param {boolean} upvote whether to upvote or downvote the question
 */
async function upvoteQuestion(qid, username, upvote){
    // NOTE: we do NOT await here as we return another async function
    return upvoteQA(qid, undefined, username, upvote);
}

/** POST /answers/:aid/upvote
 * Up/downvotes the specified Answer accoring to the user.
 *      If the user has already 'upvoted' the answer and it is the same operation, it will be undone.
 *      If the user chooses the opposite of what was previously selected, it will overwrite it.
 * @param {string} aid the _id of the answer
 * @param {string} username the user who wishes to 'upvote' the answer
 * @param {boolean} upvote whether to upvote or downvote the answer
 */
async function upvoteAnswer(aid, username, upvote){
    // NOTE: we do NOT await here as we return another async function
    return upvoteQA(undefined, aid, username, upvote);
}

/**
 * Accepts an Answer if the requestor is the original asker of the Question.
 * @param {string} aid the _id of the answer
 * @param {string} username the user who sent the request
 */
async function acceptAnswer(aid, username){

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