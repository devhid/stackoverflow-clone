/* library imports */
const elasticsearch = require('elasticsearch');

const constants = require('./constants');
const DBResult = require('./dbresult').DBResult;

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client({
    host: "http://admin:ferdman123@107.191.43.73:92"
});

const INDEX_QUESTIONS = "questions";  // INDEX_QUESTIONS is where questions are stored
const INDEX_VIEWS = "views";          // INDEX_VIEWS is where views for a question are stored
const INDEX_ANSWERS = "answers";      // INDEX_ANSWERS is where answers are stored

// NOTE: for INDEX_Q_UPVOTES and INDEX_A_UPVOTES, searching by term for 'qid' or 'aid' requires
//          specifying it as 'qid.keyword' and 'aid.keyword' due to mapping.
const INDEX_Q_UPVOTES = "q-upvotes";  // INDEX_Q_UPVOTES is where question upvotes are stored
const INDEX_A_UPVOTES = "a-upvotes";  // INDEX_A_UPVOTES is where answer upvotes are stored

async function getQuestionsByUser(username){
    let questions = (await client.search({
        index: INDEX_QUESTIONS,
        type: "_doc",
        body: {
            query: {
                term: {
                    "user.username": username
                }
            }
        }
    })).hits.hits;

    let qids = [];
    for (var question of questions){
        qids.push(question._source._id);
    }
    return qids;
}

/* milestone 1 */

/** POST /questions/add
 * Adds a Question to the ElasticSearch storage.
 * 
 * Creates:
 *  1) in INDEX_QUESTIONS, the Question document
 *  2) in INDEX_VIEWS, the Question Views metadata document
 *  3) in INDEX_Q_UPVOTES, the Question Upvotes metadata document
 * 
 * @param {ElasticSearch user} user the user object returned by ElasticSearch
 * @param {string} title the title of the question
 * @param {string} body the body of the question
 * @param {string[]} tags the tags of the question
 * @param {id[]} media the ids of any attached media
 */
async function addQuestion(user, title, body, tags, media){
    let dbResult = new DBResult();
    
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
    if (response.result !== "created"){
        console.log(`Failed to create Question document with ${user}, ${title}, ${body}, ${tags}, ${media}`);
        console.log(response);
        dbResult.status = constants.DB_RES_ERROR;
        dbResult.data = null;
        return dbResult;
    }
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
    if (viewResponse.result !== "created"){
        console.log(`Failed to create Question Views metadata document with ${user}, ${title}, ${body}, ${tags}, ${media}`);
        console.log(response);
    }
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
    if (upvoteResponse.result !== "created"){
        console.log(`Failed to create Question Upvotes metadata document with ${user}, ${title}, ${body}, ${tags}, ${media}`);
        console.log(response);
    }
    if (response){
        dbResult.status = constants.DB_RES_SUCCESS;
        dbResult.data = response._id;
    }
    else {
        dbResult.status = constants.DB_RES_ERROR;
        dbResult.data = null;
    }
    return dbResult;
}

/** GET /questions/:qid
 * Updates the view count for the specified Question based on a username or IP address.
 * @param {string} qid the _id of the question
 * @param {string} username the username for which to update the view count
 * @param {string} ip the IP address for which to update the view count
 */
async function updateViewCount(qid, username, ip){
    let dbResult = new DBResult();
    
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

    // check whether or not the question exists
    if (question_view == undefined){
        dbResult.status = constants.DB_RES_Q_NOTFOUND;
        dbResult.data = null;
        return dbResult;
    }

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
            if (updateViewResponse.updated != 1){
                console.log(`Failed to update Question Views for ${qid}`);
                console.log(updateViewResponse);
            }
        }
    }
    else {
        // unique per username
        let users = question_view._source.authenticated;
        if (users.includes(username))
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
            if (updateViewResponse.updated != 1){
                console.log(`Failed to update Question Views for ${qid}`);
                console.log(updateViewResponse);
            }
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
        if (updateResponse.updated != 1){
            console.log(`Failed to update Question view_count for ${qid}`);
            console.log(updateResponse);
        }
    }
    
    // return the question
    let question = (await client.search({
        index: INDEX_QUESTIONS,
        type: "_doc",
        body: {
            query: {
                term: {
                    _id: qid
                }
            }
        }
    })).hits.hits[0];

    if (question){
        dbResult.status = constants.DB_RES_SUCCESS;
        dbResult.data = question;
    }
    else {
        dbResult.status = constants.DB_RES_Q_NOTFOUND;
        dbResult.data = null;
    }
    return dbResult;
}

/** GET /questions/:qid
 * Retrieves the specified Question and may update its view count depending on arugments.
 * @param {string} qid the _id of the question
 * @param {string} username the username for which to update the view count if specified
 * @param {string} ip the IP address for which to update the view count if specified
 * @param {boolean} update whether or not to update the view count of the question
 */
async function getQuestion(qid, username, ip, update){
    let dbResult = new DBResult();
    let question = undefined;
    if (update){
        dbResult = await updateViewCount(qid, username, ip);
        question = dbResult.data;
    }
    // if update:
    //      if updateViewCount returned undefined, question could not be found
    //          no need to searcha again
    //      if updateViewCount returned a response, question will not be null
    //  else:
    //      try searching for the question
    if (question === undefined){
        question = (await client.search({
            index: INDEX_QUESTIONS,
            type: "_doc",
            body: {
                query: {
                    term: {
                        _id: qid
                    }
                }
            }
        })).hits.hits[0];
    }
    if (question){
        dbResult.status = constants.DB_RES_SUCCESS;
        dbResult.data = question;
    }
    else {
        dbResult.status = constants.DB_RES_Q_NOTFOUND;
        dbResult.data = null;
    }
    return dbResult;
}

/** POST /questions/:qid/answers/add
 * Adds an Answer to the specified Question.
 * 
 * Creates:
 *  1) in INDEX_ANSWERS, the Answer document
 *  2) in INDEX_A_UPVOTES, the Answer Upvotes metadata document
 * 
 * @param {string} qid the _id of the question
 * @param {string} username the username posting the answer
 * @param {string} body the body of the answer
 * @param {id[]} media array of media IDs attached to the answer
 */
async function addAnswer(qid, username, body, media){
    let dbResult = new DBResult();
    media = (media == undefined) ? [] : media;

    // check if the Question exists first
    let question = (await client.search({
        index: INDEX_QUESTIONS,
        type: "_doc",
        body: {
            query: {
                term: {
                    _id: qid
                }
            }
        }
    })).hits.hits[0];

    if (!question){
        dbResult.status = constants.DB_RES_Q_NOTFOUND;
        dbResult.data = null;
        return dbResult;
    }
    
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
    if (!response || response.result !== "created"){
        console.log(`Failed to create Answer document with ${qid}, ${username}, ${body}, ${media}`);
        console.log(response);
        return dbResult;
    }
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
    if (upvoteResponse.result !== "created"){
        console.log(`Failed to create Answer document with ${qid}, ${username}, ${body}, ${media}`);
        console.log(upvoteResponse);
    }
    dbResult.status = constants.DB_RES_SUCCESS;
    dbResult.data = response._id;
    return dbResult;
}

/** GET /questions/:qid/answers
 * Retrieves all Answers for the specified Question.
 * @param {string} qid the _id of the question
 */
async function getAnswers(qid){
    let dbResult = new DBResult();

    // check if the Question exists first
    let question = (await client.search({
        index: INDEX_QUESTIONS,
        type: "_doc",
        body: {
            query: {
                term: {
                    _id: qid
                }
            }
        }
    })).hits.hits[0];

    if (!question){
        dbResult.status = constants.DB_RES_Q_NOTFOUND;
        dbResult.data = null;
        return dbResult;
    }

    // grab all Answer documents for the specified Question
    let answers = (await client.search({
        index: INDEX_ANSWERS,
        body: {
            query: {
                term: {
                    "qid": qid
                }
            }
        }
    })).hits.hits;

    // transform them to fit the external model
    var transformedAnswers = [];
    for (var i in answers){
        let ans = answers[i];
        ans._source[constants.ID_KEY] = ans._id;
        ans = ans._source;
        ans.media = (ans.media.length == 0) ? null : ans.media;
        delete ans.qid;
        transformedAnswers.push(ans);
    }

    dbResult.status = constants.DB_RES_SUCCESS;
    dbResult.data = transformedAnswers;

    return dbResult;
}

/* milestone 2 */

/**
 * Deletes the specified Question if it belongs to the right user.
 * 
 * Deletes:
 *  1) in INDEX_QUESTIONS, the Question document
 *  2) in INDEX_VIEWS, the Question Views metadata document
 *  3) in INDEX_Q_UPVOTES, the Question Upvotes metadata document
 *  4) in INDEX_ANSWERS, any associated Answer documents
 *  5) any associated media documents
 * 
 * @param {string} qid the _id of the question
 * @param {string} username the user who originally posted the question
 */
async function deleteQuestion(qid, username){
    let dbResult = new DBResult();
    const getRes = await getQuestion(qid, username);
    let response = undefined;
    if (getRes.status === constants.DB_RES_Q_NOTFOUND){
        return getRes;
    }
    let question = getRes.data;

    // If the DELETE operation was specified by the original asker, then delete
    if (username == question._source.user.username){
        
        // 1) DELETE from INDEX_QUESTIONS the Question document
        response = await client.delete({
            index: INDEX_QUESTIONS,
            type: "_doc",
            id: qid
        });
        if (response.result !== 'deleted'){
            console.log(`Failed to delete question ${qid} from ${INDEX_QUESTIONS}`);
            console.log(response);
        }

        // 2) DELETE from INDEX_VIEWS the Question Views metadata document
        response = await client.deleteByQuery({
            index: INDEX_VIEWS,
            type: "_doc",
            body: { 
                query: { 
                    term: { 
                        qid: qid
                    } 
                }, 
            }
        });
        if (response.deleted != 1){
            console.log(`Failed to delete question views ${qid} from ${INDEX_VIEWS}`);
            console.log(response);
        }

        // 3) DELETE from INDEX_Q_UPVOTES the Question Upvotes metadata document
        response = await client.deleteByQuery({
            index: INDEX_Q_UPVOTES,
            type: "_doc",
            body: { 
                query: { 
                    term: { 
                        "qid.keyword": qid
                    } 
                }, 
            }
        });
        if (response.deleted != 1){
            console.log(`Failed to delete question upvotes ${qid} from ${INDEX_Q_UPVOTES}`);
            console.log(response);
        }

        // 4) DELETE from INDEX_ANSWERS any associated Answer documents
        response = await client.deleteByQuery({
            index: INDEX_ANSWERS,
            type: "_doc",
            body: {
                query: {
                    term: {
                        qid: qid
                    }
                }
            }
        });
        console.log(`Deleted ${response.deleted} Answers for Question ${qid}`);
        console.log(response);

        // TODO: 5) DELETE any associated media documents

        dbResult.status = constants.DB_RES_SUCCESS;
        dbResult.data = null;
    }
    else {
        dbResult.status = constants.DB_RES_NOT_ALLOWED;
        dbResult.data = null;
    }
    return dbResult;
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
    let dbResult = new DBResult();
    let which_index = (aid == undefined) ? INDEX_Q_UPVOTES : INDEX_A_UPVOTES;
    let which_id = (aid == undefined) ? "qid.keyword" : "aid.keyword";
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
    let success = (undoVoteResponse.updated == 1) ? constants.DB_RES_SUCCESS : constants.DB_RES_ERROR;
    if (success !== DB_RES_SUCCESS){
        console.log(`Failed undoVote(${qid}, ${aid}, ${username}, ${upvote})`);
    }
    dbResult.status = success;
    dbResult.data = null;
    return dbResult;
}

/** helper for POST /questions/:qid/upvote and POST /answers/:aid/upvote
 * Adds a user's vote to the specified Question or Answer.
 * @param {string} qid the _id of the question (if used for adding the vote to a question)
 * @param {string} aid the _id of the answer (if used for adding the vote to an answer)
 * @param {string} username the user who wishes to add his vote for the question/answer
 * @param {boolean} upvote whether the user's vote is to upvote or downvote
 */
async function addVote(qid, aid, username, upvote){
    let dbResult = new DBResult();
    let which_index = (aid == undefined) ? INDEX_Q_UPVOTES : INDEX_A_UPVOTES;
    let which_id = (aid == undefined) ? "qid.keyword" : "aid.keyword";
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
    let success = (addVoteResponse.updated == 1) ? constants.DB_RES_SUCCESS : constants.DB_RES_ERROR;
    if (success !== DB_RES_SUCCESS){
        console.log(`Failed addVote(${qid}, ${aid}, ${username}, ${upvote})`);
    }
    dbResult.status = success;
    dbResult.data = null;
    return dbResult;
}

/** helper for POST /questions/:qid/upvote and POST /answers/:aid/upvote
 * Updates the score of a specified Question or Answer by the amount.
 * @param {string} qid the _id of the question (if used for updating the score of a question)
 * @param {string} aid the _id of the answer (if used for updating the score of an answer)
 * @param {integer} amount the amount by which to add to the current score of the question or answer
 */
async function updateScore(qid, aid, amount){
    let dbResult = new DBResult();
    let which_index = (aid == undefined) ? INDEX_Q_UPVOTES : INDEX_A_UPVOTES;
    let which_id = (aid == undefined) ? "qid.keyword" : "aid.keyword";
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
    let success = (updateResponse.updated == 1) ? constants.DB_RES_SUCCESS : constants.DB_RES_ERROR;
    if (success !== DB_RES_SUCCESS){
        console.log(`Failed updateScore(${qid}, ${aid}, ${amount})`);
    }
    dbResult.status = success;
    dbResult.data = null;
    return dbResult;
}

/**
 * Up/downvotes the specified Question or Answer according to the user.
 * @param {string} qid the _id of the question (if used for adding the vote to a question)
 * @param {string} aid the _id of the answer (if used for adding the vote to an answer)
 * @param {string} username the user who wishes to add his vote for the question/answer
 * @param {boolean} upvote whether the user's vote is to upvote or downvote
 */
async function upvoteQA(qid, aid, username, upvote){
    let dbResult = new DBResult();
    let which_index = (aid == undefined) ? INDEX_Q_UPVOTES : INDEX_A_UPVOTES;
    let which_id = (aid == undefined) ? "qid.keyword" : "aid.keyword";
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
    if (qa_votes == undefined){
        dbResult.status = constants.DB_RES_Q_NOTFOUND;
        dbResult.data = null;
        return dbResult;
    }

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
        let undoVoteRes = await undoVote(qid, aid, username, in_upvotes);
        if (undoVoteRes.status !== constants.DB_RES_SUCCESS){
            console.log(`Failed undoVote in upvoteQA(${qid}, ${aid}, ${username}, ${upvote})`);
        }
    }
    if ((upvote && downvoted) || (!upvote && upvoted)){
        let addVoteRes = await addVote(qid, aid, username, upvote);
        if (undoVoteRes.status === constants.DB_RES_SUCCESS){
            // if the user wishes to UPVOTE but DOWNVOTED, we must add the UPVOTE
            if (upvote && downvoted){
                score_diff += 1;
            }
            // if the user wishes to DOWNVOTE but UPVOTED, we must add the DOWNVOTE
            else if (!upvote && upvoted){
                score_diff -= 1;
            }
        }
        else {
            console.log(`Failed addVote in upvoteQA(${qid}, ${aid}, ${username}, ${upvote})`);
        }
    }

    // update the score of the question or answer
    let updateRes = await updateScore(qid, aid, score_diff);
    if (updateRes.status !== constants.DB_RES_SUCCESS){
        console.log(`Failed updateScore in upvoteQA(${qid}, ${aid}, ${username}, ${upvote})`);
    }
    return updateRes;
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
    let dbResult = new DBResult();
    let qid = undefined;

    // before we perform any updates, first ensure that the specified Answer exists
    let answer = (await client.search({
        index: INDEX_ANSWERS,
        type: "_doc",
        body: {
            query: {
                term: {
                    _id: aid
                }
            }
        }
    })).hits.hits[0];
    
    if (!answer){
        dbResult.status = constants.DB_RES_A_NOTFOUND;
        dbResult.data = null;
        return dbResult;
    }

    // grab the Question document and check that it exists
    qid = answer._source.qid;
    let question = (await client.search({
        index: INDEX_QUESTIONS,
        type: "_doc",
        body: {
            query: {
                term: {
                    _id: qid
                }
            }
        }
    })).hits.hits[0];
    
    if (!question){
        dbResult.status = constants.DB_RES_Q_NOTFOUND;
        dbResult.data = null;
        return dbResult;
    }

    // if the user is the original asker, update the Question and Answer documents
    if (username == question._source.user.username){
        // check if the asker has already accepted a different answer
        //      if the asker has, then we must update the old accepted Answer document
        const accepted_answer_id = question.accepted_answer_id;
        if (accepted_answer_id != null && accepted_answer_id != aid){
            const updateOldAcceptedResponse = await client.update({
                index: INDEX_ANSWERS,
                type: "_doc",
                id: accepted_answer_id,
                body: {
                    script: {
                        lang: "painless",
                        inline: "ctx._source.is_accepted = false"
                    }
                }
            });
            // TODO: check the format of the response for failure handling
            console.log("updateOldAcceptedResponse below");
            console.log(updateOldAcceptedResponse);
        }

        // update the Question document's "accepted_answer_id" field
        const updateQuestionResponse = client.update({
            index: INDEX_QUESTIONS,
            type: "_doc",
            id: question._id,
            body: {
                script: {
                    lang: "painless",
                    inline: "ctx._source.accepted_answer_id = params.answerID"
                },
                params: {
                    answerID: aid
                }
            }
        });
        console.log("updateQuestionResponse below");
        console.log(updateQuestionResponse);

        // update the Answer document's "is_accepted" field
        const updateAnswerResponse = client.update({
            index: INDEX_ANSWERS,
            type: "_doc",
            id: aid,
            body: {
                script: {
                    lang: "painless",
                    inline: "ctx._source.is_accepted = true"
                }
            }
        });
        console.log("updateAnswerResponse below");
        console.log(updateAnswerResponse);
        dbResult.status = constants.DB_RES_SUCCESS;
        dbResult.data = null;
    }
    else {
        dbResult.status = constants.DB_RES_NOT_ALLOWED;
        dbResult.data = null;
    }
    return dbResult;
}

module.exports = {
    getQuestionsByUser: getQuestionsByUser,
    addQuestion: addQuestion,
    getQuestion: getQuestion,
    deleteQuestion: deleteQuestion,
    addAnswer: addAnswer,
    getAnswers: getAnswers,
    upvoteQuestion: upvoteQuestion,
    upvoteAnswer: upvoteAnswer,
    acceptAnswer: acceptAnswer
};