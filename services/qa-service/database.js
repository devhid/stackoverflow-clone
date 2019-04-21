/* library imports */
const elasticsearch = require('elasticsearch');

/* internal imports */
const constants = require('./constants');
const DBResult = require('./dbresult').DBResult;

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client({
    host: "http://admin:ferdman123@107.191.43.73:92"
});

const INDEX_QUESTIONS = "questions";  // INDEX_QUESTIONS is where questions are stored
const INDEX_VIEWS = "views";          // INDEX_VIEWS is where views for a question are stored
const INDEX_ANSWERS = "answers";      // INDEX_ANSWERS is where answers are stored
const INDEX_USERS = "users";          // INDEX_USERS is where users are stored

// NOTE: for INDEX_Q_UPVOTES and INDEX_A_UPVOTES, searching by term for 'qid' or 'aid' requires
//          specifying it as 'qid.keyword' and 'aid.keyword' due to mapping.
const INDEX_Q_UPVOTES = "q-upvotes";  // INDEX_Q_UPVOTES is where question upvotes are stored
const INDEX_A_UPVOTES = "a-upvotes";  // INDEX_A_UPVOTES is where answer upvotes are stored

async function getQuestionsByUser(username){
    let questions = (await client.search({
        index: INDEX_QUESTIONS,
        size: 10000,
        type: "_doc",
        body: {
            query: {
                match: {
                    "user.username": username
                }
            }
        }
    })).hits.hits;
    let qids = [];
    for (var question of questions){
        qids.push(question._id);
    }
    return qids;
}

/**
 * Gets the username of a User by a post.
 * @param {string} qid the _id of the question (if the post is a Question)
 * @param {string} aid the _id of the answer (if the post is an Answer)
 */
async function getUserByPost(qid, aid){
    let which_index = (aid == undefined) ? INDEX_QUESTIONS : INDEX_ANSWERS;
    let id_value = (aid == undefined) ? qid : aid;
    let post = (await client.search({
        index: which_index,
        body: {
            query: {
                term: {
                    _id: id_value
                }
            }
        }
    })).hits.hits[0];
    let user = (post == undefined) ? post : ((which_index == INDEX_QUESTIONS) ? post._source.user.username : post._source.user);
    return user;
}

/** /questions/:id/upvote, /answers/:id/upvote
 * Retrieves the "actual" reputation of a specified user.
 * @param {string} username the username of the user
 */
async function getReputation(username){
    let user = (await client.search({
        index: INDEX_USERS,
        size: 1,
        type: "_doc",
        body: {
            query: {
                match: {
                    "username": username
                }
            }
        }
    })).hits.hits[0];
    return user._source.actual_reputation;
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
                "reputation": user._source.reputation,
                "actual_reputation": user._source.actual_reputation
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
 *  5) in INDEX_A_UPVOTES, the Answer Upvotes metadata document
 *  6) any associated media documents
 * 
 * @param {string} qid the _id of the question
 * @param {string} username the user who originally posted the question
 */
async function deleteQuestion(qid, username){
    console.log(`deleteQuestion(${qid},${username})`);
    let dbResult = new DBResult();
    const getRes = await getQuestion(qid, username);
    let response = undefined;
    if (getRes.status === constants.DB_RES_Q_NOTFOUND){
        return getRes;
    }
    let question = getRes.data;

    // If the DELETE operation was specified by the original asker, then delete
    if (username == question._source.user.username){
        console.log(`Deleting ${qid} by ${username}`);
        // 1) DELETE from INDEX_QUESTIONS the Question document
        response = await client.deleteByQuery({
            index: INDEX_QUESTIONS,
            type: "_doc",
            body: {
                query: {
                    term: {
                        _id: qid
                    }
                }
            }
        });
        if (response.deleted != 1){
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


        // 5) DELETE from INDEX_A_UPVOTES the Answer Upvotes metadata document
        response = await client.deleteByQuery({
            index: INDEX_A_UPVOTES,
            type: "_doc",
            body: {
                query: {
                    term: {
                        "aid.keyword": aid
                    }
                }
            }
        });
        if (response.deleted != 1){
            console.log(`Failed to delete answer upvotes ${aid} from ${INDEX_A_UPVOTES}`);
            console.log(response);
        }

        // TODO: 6) DELETE any associated media documents

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
    if (success !== constants.DB_RES_SUCCESS){
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
    let inline_script = `ctx._source.${arr}.add(params.${param_user})`
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
    if (success !== constants.DB_RES_SUCCESS){
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
    let which_index = (aid == undefined) ? INDEX_QUESTIONS : INDEX_ANSWERS;
    let id_value = (aid == undefined) ? qid : aid;
    let param_amount = "amount";
    let inline_script = `ctx._source.score += params.${param_amount}`
    const updateResponse = await client.updateByQuery({
        index: which_index,
        type: "_doc",
        refresh: "true",
        body: { 
            query: { 
                term: { 
                    _id: id_value
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
    if (success !== constants.DB_RES_SUCCESS){
        console.log(`Failed updateScore(${qid}, ${aid}, ${amount})`);
    }
    dbResult.status = success;
    dbResult.data = null;
    return dbResult;
}

/**
 * Updates the reputation of a User by the specified amount.
 * 
 * Needs to update the reputation of the User document as well as the associated Question documents.
 * @param {string} username username of the user
 * @param {int} amount amount by which to update the reputation
 */
async function updateReputation(username, original_rep, amount){
    let dbResult = new DBResult();
    let param_amount = "amount";
    let inline_script = `ctx._source.actual_reputation += params.${param_amount}`;
    const updateUserResponse = await client.updateByQuery({
        index: INDEX_USERS,
        type: "_doc",
        refresh: "true",
        body: { 
            query: { 
                match: { 
                    "username": username
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
    let success = (updateUserResponse.updated == 1) ? constants.DB_RES_SUCCESS : constants.DB_RES_ERROR;
    if (success !== constants.DB_RES_SUCCESS){
        console.log(`Failed updateUserReputation(${username}, ${amount})`);
    }

    inline_script = `ctx._source.user.actual_reputation += params.${param_amount}`;
    const updateQResponse = await client.updateByQuery({
        index: INDEX_QUESTIONS,
        size: 10000,
        type: "_doc",
        refresh: "true",
        body: { 
            query: { 
                match: { 
                    "user.username": username
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
    let success2 = (updateQResponse.updated >= 1) ? constants.DB_RES_SUCCESS : constants.DB_RES_ERROR;
    if (success2 !== constants.DB_RES_SUCCESS){
        console.log(`Failed updateQReputation(${username}, ${amount})`);
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
    
    // check that the specified question or answer exists
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

    // if it could not be found, the question or answer does not exist
    if (qa_votes == undefined){
        if (which_index == INDEX_Q_UPVOTES){
            dbResult.status = constants.DB_RES_Q_NOTFOUND;
        }
        else {
            dbResult.status = constants.DB_RES_A_NOTFOUND;
        }
        dbResult.data = null;
        return dbResult;
    }

    // first check if there are any elements in the upvotes and downvotes
    //      ElasticSearch treats them as missing fields if they are empty
    let upvotes = (qa_votes._source.upvotes == undefined) ? [] : qa_votes._source.upvotes;
    let downvotes = (qa_votes._source.downvotes == undefined) ? [] : qa_votes._source.downvotes;
    console.log(`upvotes = ${upvotes}`);
    console.log(`downvotes = ${downvotes}`);

    // check if the user downvoted or upvoted the question
    let score_diff = 0;     // the difference in the "score" of a question
    let rep_diff = 0;       // the difference in the "reputation" of a user, >= 1
    let upvoted = upvotes.includes(username);
    let downvoted  = downvotes.includes(username);
    let poster = await getUserByPost(qid,aid);
    let poster_rep = await getReputation(poster);
    console.log(`poster = ${poster}`);
    console.log(`poster_rep = ${poster_rep}`);
    console.log(`upvoted = ${upvoted}`);
    console.log(`downvoted = ${downvoted}`);

    // if the user already voted, undo the vote
    if (upvoted || downvoted){
        let in_upvotes = (upvoted) ? true : false;
        //  if it was upvoted, then subtract 1
        //      else if it was downvoted, add 1
        rep_diff = (upvoted) ? -1 : 1;
        score_diff = (upvoted) ? -1 : 1;
        console.log(`undoing vote by ${poster}`);
        let undoVoteRes = await undoVote(qid, aid, username, in_upvotes);
        if (undoVoteRes.status !== constants.DB_RES_SUCCESS){
            console.log(`Failed undoVote in upvoteQA(${qid}, ${aid}, ${username}, ${upvote})`);
        }
    }

    // add the vote
    let waive_vote = false; 
    rep_diff = (upvote) ? rep_diff + 1 : rep_diff - 1;
    score_diff = (upvote) ? score_diff + 1 : score_diff - 1;

    console.log(`adding vote ${qid}, ${aid}, ${username}, ${upvote}, ${waive_vote}`);
    let addVoteRes = await addVote(qid, aid, username, upvote);
    if (addVoteRes.status !== constants.DB_RES_SUCCESS){
        console.log(`Failed addVote in upvoteQA(${qid}, ${aid}, ${username}, ${upvote})`);
    }

    // update the score of the question or answer
    console.log(`updating score ${qid}, ${aid}, ${score_diff}`);
    let updateScoreRes = await updateScore(qid, aid, score_diff);
    if (updateScoreRes.status !== constants.DB_RES_SUCCESS){
        console.log(`Failed updateScore in upvoteQA(${qid}, ${aid}, ${username}, ${upvote})`);
    }

    // update the reputation of the poster
    console.log(`updating rep ${poster}, ${rep_diff}`);
    let updateRepRes = await updateReputation(poster, poster_rep, rep_diff);
    if (updateRepRes.status !== constants.DB_RES_SUCCESS){
        console.log(`Failed updateReputation in upvoteQA(${qid}, ${aid}, ${username}, ${upvote})`);
    }

    dbResult.status = constants.DB_RES_SUCCESS;
    dbResult.data = null;
    return dbResult;
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
 * 
 * TODO: cleanup, cannot accept a diff answer
 */
async function acceptAnswer(aid, username){
    let dbResult = new DBResult();
    let qid = undefined;

    // grab the Answer document
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
    
    // check that the Answer exists
    if (!answer){
        dbResult.status = constants.DB_RES_A_NOTFOUND;
        dbResult.data = null;
        return dbResult;
    }

    // grab the Question document
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
    
    // check that the Question exists
    if (!question){
        dbResult.status = constants.DB_RES_Q_NOTFOUND;
        dbResult.data = null;
        return dbResult;
    }

    // check that the Question does not already have an accepted answer
    if (question._source.accepted_answer_id != null){
        dbResult.status = constants.DB_RES_ALRDY_ACCEPTED;
        dbResult.data = null;
        return dbResult;
    }

    // if the user is the original asker, update the Question and Answer documents
    if (username == question._source.user.username){
        // // check if the asker has already accepted a different answer
        // //      if the asker has, then we must update the old accepted Answer document
        // const accepted_answer_id = question.accepted_answer_id;
        // if (accepted_answer_id != null && accepted_answer_id != aid){
        //     const updateOldAcceptedResponse = await client.update({
        //         index: INDEX_ANSWERS,
        //         type: "_doc",
        //         id: accepted_answer_id,
        //         body: {
        //             script: {
        //                 lang: "painless",
        //                 inline: "ctx._source.is_accepted = false"
        //             }
        //         }
        //     });
        //     // TODO: check the format of the response for failure handling
        //     console.log("updateOldAcceptedResponse below");
        //     console.log(updateOldAcceptedResponse);
        // }

        // update the Question document's "accepted_answer_id" field
        const updateQuestionResponse = await client.updateByQuery({
            index: INDEX_QUESTIONS,
            type: "_doc",
            refresh: "true",
            body: {
                query: {
                    term: {
                        _id: qid
                    }
                },
                script: {
                    lang: "painless",
                    inline: "ctx._source.accepted_answer_id = params.answerID",
                    params: {
                        "answerID": aid
                    }
                }
            }
        });
        if (updateQuestionResponse.updated != 1){
            console.log(`Failed to update Question ${qid}'s accepted answer to ${aid}`);
            console.log(updateQuestionResponse);
        }

        // update the Answer document's "is_accepted" field
        const updateAnswerResponse = await client.update({
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
        const updateAnswerResponse = await client.updateByQuery({
            index: INDEX_ANSWERS,
            type: "_doc",
            refresh: "true",
            body: {
                query: {
                    term: {
                        _id: aid
                    }
                },
                script: {
                    lang: "painless",
                    inline: "ctx._source.is_accepted = true"
                }
            }
        });
        if (updateAnswerResponse.updated != 1){
            console.log(`Failed to update Answer ${aid}'s is_accepted field to true`);
            console.log(updateAnswerResponse);
        }
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
