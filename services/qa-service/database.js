/* library imports */
const cassandra = require('cassandra-driver');
const elasticsearch = require('elasticsearch');
const uuidv4 = require('uuid/v4');

/* internal imports */
const constants = require('./constants');
const DBResult = require('./dbresult').DBResult;

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client(constants.ELASTICSEARCH_OPTIONS);

/* client to communicate with cassandra */
const cassandraOptions = constants.CASSANDRA_OPTIONS;
const cassandra_client = new cassandra.Client(cassandraOptions);
cassandra_client.connect()
    .then(() => {
        console.log(`[Cassandra] : Successfully established connection to keyspace, '${cassandraOptions.keyspace}'.`)
    }).catch((error) => {
        console.log(`[Cassandra] : Could not connect to keyspace, '${cassandraOptions.keyspace}'.`);
        console.log(`[Cassandra] Error ${error}`)
    });

// NOTE: for all indices, if "qid" or "aid" or "user_id" (any _id fields) are present in _source,
//      and we need to do an action by querying those fields, query the name + ".keyword"
const INDEX_QUESTIONS = "questions";  // INDEX_QUESTIONS is where questions are stored
const INDEX_VIEWS = "views";          // INDEX_VIEWS is where views for a question are stored

const INDEX_ANSWERS = "answers";      // INDEX_ANSWERS is where answers are stored
const INDEX_USERS = "users";          // INDEX_USERS is where users are stored

const INDEX_Q_UPVOTES = "q-upvotes";  // INDEX_Q_UPVOTES is where question upvotes are stored
const INDEX_A_UPVOTES = "a-upvotes";  // INDEX_A_UPVOTES is where answer upvotes are stored

const INDEX_MEDIA = "media";          // INDEX_MEDIA is where the media metadata is located

/* media */

function shutdown(){
    cassandra_client.shutdown();
}

/**
 * Transforms a JavaScript array of strings into a Cassandra parenthesized list of strings.
 * @param {string[]} arr JS array of strings
 * @param {boolean} quotes whether or not we want quotes around each element
 */
function transformArrToCassandraList(arr, quotes){
    var list = `(`;
    for (var elem of arr){
        list += (quotes) ? `'${elem}',` : `${elem},`;
    }
    list = list.substring(0,list.length-1);
    list += `)`;
    return list;
}

function getPreparedList(arr){
    var list = `(`;
    for (var elem of arr){
        list += '?,';
    }
    list = list.substring(0,list.length-1);
    list += `)`;
    return list;
}

function associateFreeMediaBulkBody(qa_id, ids){
    // if no media, no need to do anything  
    if (ids == null || ids.length == 0){
        return [];
    }

    // build the bulk request that will index a Media metadata document
    let bulk_query = { body : [] };
    let action_doc = undefined;
    let partial_doc = undefined;
    for (var id of ids){
        action_doc = {
            index: {
                _index: INDEX_MEDIA,
                _type: "_doc",
                _id: id
            }
        };
        partial_doc = {
            "qa_id": qa_id
        };
        bulk_query.body.push(action_doc);
        bulk_query.body.push(partial_doc);
    }
    return bulk_query.body;
}

/**
 * Marks the free media in Cassandra to be associated with a Question.
 * @param {id[]} ids array of media IDs in Cassandra
 */
async function associateFreeMedia(qa_id, ids){
    // if no media, no need to do anything  
    if (ids == null || ids.length == 0){
        return new DBResult(constants.DB_RES_SUCCESS, null);
    }

    // build the bulk request that will index a Media metadata document
    let bulk_query = { body : [] };
    let action_doc = undefined;
    let partial_doc = undefined;
    for (var id of ids){
        action_doc = {
            index: {
                _index: INDEX_MEDIA,
                _type: "_doc",
                _id: id
            }
        };
        partial_doc = {
            "qa_id": qa_id
        };
        bulk_query.body.push(action_doc);
        bulk_query.body.push(partial_doc);
    }
    let bulkResponse = null;
    if (bulk_query.body.length > 0){
        bulkResponse = await client.bulk(bulk_query);
        // console.log(`[QA] Bulk performed... ${JSON.stringify(bulk_query.body)}`);
        // console.log(`[QA] Bulk response... ${JSON.stringify(bulkResponse)}`);
    }

    // indicate success
    return new DBResult(constants.DB_RES_SUCCESS, null);
}

/**
 * Checks if the given media IDs are valid and can be associated with a new Question.
 * @param {id[]} ids array of media IDs in Cassandra
 * @param {string} poster the person who wishes to use the media ids listed
 */
async function checkFreeMedia(ids, poster){
    // if no media, no need to do anything  
    if (ids == null || ids.length == 0){
        return new DBResult(constants.DB_RES_SUCCESS, null);
    }

    // check if the ids have already been associated with some other Question or Answer
    let promises = [];
    let promise = null;
    for (var id of ids){
        promise = client.get({
            id: id,
            index: INDEX_MEDIA,
            type: "_doc",
            // refresh: "true",
            _source: false
        });
        promises.push(promise);
    }

    // execute the GETs concurrently and wait for all the results
    let results = null;
    try {
        results = await Promise.all(promises);

        // if the promises executed successfully, there is an invalid media id
        let response = null;
        for (var index in results){
            response = results[index];
            console.log(`[QA] checkFreeMedia found in use ${response._id}`);
        }
        return new DBResult(constants.DB_RES_MEDIA_INVALID, null);
    } catch (err){
        console.log(`[QA] checkFreeMedia err ${err}`);
    }

    // grab the poster name for each media id
    //let list_ids = transformArrToCassandraList(ids, false);
    //let query = `SELECT poster FROM ${cassandraOptions.keyspace}.${cassandraOptions.table} WHERE id in ${list_ids}`;
    let prepared_list = getPreparedList(ids);
    let query = `SELECT poster FROM ${cassandraOptions.keyspace}.${cassandraOptions.table} WHERE id in ${prepared_list}`;
    console.log(`[QA] checkFreeMedia query=${query}`);

    // await the cassandra query and check for the response
    let result = null;
    try {
        result = await cassandra_client.execute(query, ids, {prepare: true});
    } catch (err){
        console.log(`[QA] checkFreeMedia getting poster error ${err}`);
        return new DBResult(constants.DB_RES_MEDIA_INVALID, null);
    }

    if (result.rowLength != ids.length){
        return new DBResult(constants.DB_RES_MEDIA_INVALID, null);
    }
    for (var row of result.rows){
        if (row.poster !== poster){
            return new DBResult(constants.DB_RES_MEDIA_INVALID, null);
        }
    }

    return new DBResult(constants.DB_RES_SUCCESS, null);
}

/**
 * Deletes media from Cassandra given an array of their IDs and its associated Question or Answer.
 * @param {id} qa_id the associated Question or Answer
 * @param {id[]} ids array of media IDs in Cassandra
 * 
 * TODO: check if Cassandra actually deleted the media
 */
function deleteArrOfMedia(ids){
    console.log(`[QA] deleteArrOfMedia ids=${ids}`);
    // if no media, no need to do anything
    if (ids == null || ids.length == 0){
        return new DBResult(constants.DB_RES_SUCCESS, null);
    }

    // transform the array of media IDs to the expected format Cassandra wants them in ('id', 'id')
    // var list_ids = transformArrToCassandraList(ids, false);
    var prepared_list = getPreparedList(ids);

    // prepare the query
    // const query = `DELETE FROM ${cassandraOptions.keyspace}.${cassandraOptions.table} WHERE id IN ${list_ids}`;
    const query = `DELETE FROM ${cassandraOptions.keyspace}.${cassandraOptions.table} WHERE id IN ${prepared_list}`;
    console.log(`[QA] deleteArrOfMedia query=${query}`);

    let promises = [];
    let cassandraResp = cassandra_client.execute(query, ids, {prepare: true});
    promises.push(cassandraResp);

    // build the bulk request that will delete all Media metadata documents
    let bulk_query = { body : [] };
    let action_doc = null;
    for (var id of ids){
        action_doc = {
            delete: {
                _index: INDEX_MEDIA,
                _type: "_doc",
                _id: id
            }
        };
        bulk_query.body.push(action_doc);
    }
    let bulkResponse = null;
    if (bulk_query.body.length > 0){
        bulkResponse = client.bulk(bulk_query);
        promises.push(bulkResponse);
    }

    return Promise.all(promises);
}

/* helpers */

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
    return user._source.reputation;
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
 * @param {id} id the id to use if specified
 * @param {int} timestamp UTC timestamp
 */
async function addQuestion(user, title, body, tags, media, id, timestamp){
    media = (media == undefined) ? [] : media;

    if (media.length > 0){
        // first, check that the media IDs specified 
        //       1) are not already associated with another Question or Answer document
        //       2) belong to the user trying to post the question
        let cassandraResp = await checkFreeMedia(media, user._source.username);
        if (cassandraResp.status != constants.DB_RES_SUCCESS){
            return new DBResult(constants.DB_RES_MEDIA_INVALID, null);
        }
    }

    // create the Question document in INDEX_QUESTIONS
    timetsamp = (timestamp == undefined) ? Date.now()/1000 : timestamp;
    id = (id == undefined) ? uuidv4() : id;
    // let question = {
    //     index: INDEX_QUESTIONS,
    //     type: "_doc",
    //     id: id,
    //     // refresh: "true",
    //     body: {
    //         "id": id,
    //         "user": {
    //             "username": user._source.username,
    //             "reputation": user._source.reputation
    //         },
    //         "title": title,
    //         "body": body,
    //         "score": 0,
    //         "view_count": 0,
    //         "answer_count": 0,
    //         "timestamp": timestamp,
    //         "media": media,
    //         "tags": tags,
    //         "accepted_answer_id": null
    //     }
    // };
    let bulk_insert = { body: [] };
    let action_doc = undefined;
    let partial_doc = undefined;
    action_doc = {
        index: {
            _index: INDEX_QUESTIONS,
            _type: "_doc",
            _id: id
        }
    };
    partial_doc = {
        "id": id,
        "user": {
            "username": user._source.username,
            "reputation": user._source.reputation
        },
        "title": title,
        "body": body,
        "score": 0,
        "view_count": 0,
        "answer_count": 0,
        "timestamp": timestamp,
        "media": media,
        "tags": tags,
        "accepted_answer_id": null
    };
    bulk_insert.body.push(action_doc);
    bulk_insert.body.push(partial_doc);
    // let response = await client.index(question);
    // // if (response.result !== "created"){
    // //     console.log(`[QA] Failed to create Question document with ${user}, ${title}, ${body}, ${tags}, ${media}`);
    // //     console.log(response);
    // //     return new DBResult(constants.DB_RES_ERROR, null);
    // // }
    
    // create the Question Views document in INDEX_VIEWS
    // let viewResponse = client.index({
    //     index: INDEX_VIEWS,
    //     type: "_doc",
    //     // refresh: "true",
    //     body: {
    //         "qid": response._id,
    //         "authenticated": [],
    //         "unauthenticated": []
    //     }
    // });
    action_doc = {
        index: {
            _index: INDEX_VIEWS,
            _type: "_doc"
        }
    };
    partial_doc = {
        "qid": id,
        "authenticated": [],
        "unauthenticated": []
    };
    bulk_insert.body.push(action_doc);
    bulk_insert.body.push(partial_doc);
    // let viewResponse = await client.index({
    //     index: INDEX_VIEWS,
    //     type: "_doc",
    //     // refresh: "true",
    //     body: {
    //         "qid": response._id,
    //         "authenticated": [],
    //         "unauthenticated": []
    //     }
    // });
    // if (viewResponse.result !== "created"){
    //     console.log(`[QA] Failed to create Question Views metadata document with ${user}, ${title}, ${body}, ${tags}, ${media}`);
    //     console.log(viewResponse);
    // }

    // create the Question Upvotes document in INDEX_Q_UPVOTES
    // let upvoteResponse = client.index({
    //     index: INDEX_Q_UPVOTES,
    //     type: "_doc",
    //     // refresh: "true",
    //     body: {
    //         "qid": response._id,
    //         "upvotes": [],
    //         "downvotes": [],
    //         "waived_downvotes": []
    //     }
    // });
    action_doc = {
        index: {
            _index: INDEX_Q_UPVOTES,
            _type: "_doc"
        }
    };
    partial_doc = {
        "qid": id,
        "upvotes": [],
        "downvotes": [],
        "waived_downvotes": []
    };
    bulk_insert.body.push(action_doc);
    bulk_insert.body.push(partial_doc);
    // let upvoteResponse = await client.index({
    //     index: INDEX_Q_UPVOTES,
    //     type: "_doc",
    //     // refresh: "true",
    //     body: {
    //         "qid": response._id,
    //         "upvotes": [],
    //         "downvotes": [],
    //         "waived_downvotes": []
    //     }
    // });
    // if (upvoteResponse.result !== "created"){
    //     console.log(`[QA] Failed to create Question Upvotes metadata document with ${user}, ${title}, ${body}, ${tags}, ${media}`);
    //     console.log(upvoteResponse);
    // }
    
    // associate the free media IDs with the new Question
    let media_body = associateFreeMediaBulkBody(id, media);
    bulk_insert.body = bulk_insert.body.concat(media_body);

    await client.bulk(bulk_insert);
    // let associateMediaResponse = await associateFreeMedia(response._id,media);
    // if (associateMediaResponse.status !== constants.DB_RES_SUCCESS){
    //     console.log(`[QA] associateFreeMedia failed with qa_id=${response._id}, media=${media}`);
    //     console.log(`[QA] associateFreeMedia err: ${associateMediaResponse.data}`);
    // }

    return new DBResult(constants.DB_RES_SUCCESS, id);
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
                term: {
                    "qid.keyword": qid
                }
            }
        }
    })).hits.hits[0];

    // check whether or not the question exists
    if (question_view == undefined){
        return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
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
                // refresh: "true",
                body: { 
                    query: { 
                        term: { 
                            "qid.keyword": qid
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
                console.log(`[QA] Failed to update Question Views for ${qid}`);
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
                // refresh: "true",
                body: { 
                    query: { 
                        term: { 
                            "qid.keyword": qid
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
                console.log(`[QA] Failed to update Question Views for ${qid}`);
                console.log(updateViewResponse);
            }
        }
    }

    // perform the update if necessary
    if (update === true){
        const updateResponse = await client.updateByQuery({
            index: INDEX_QUESTIONS,
            type: "_doc",
            // refresh: "true",
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
            console.log(`[QA] Failed to update Question view_count for ${qid}`);
            console.log(updateResponse);
        }
    }
    
    // return the question
    let question = null;
    try {
        question = await client.get({
            id: qid,
            index: INDEX_QUESTIONS,
            type: "_doc",
            // refresh: "true"
        });
        return new DBResult(constants.DB_RES_SUCCESS, question);
    } catch(err){
        console.log(`[QA] getQuestion ${qid} not found.`);
    }
    return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
}

/** GET /questions/:qid
 * Retrieves the specified Question and may update its view count depending on arugments.
 * @param {string} qid the _id of the question
 * @param {string} username the username for which to update the view count if specified
 * @param {string} ip the IP address for which to update the view count if specified
 * @param {boolean} update whether or not to update the view count of the question
 */
async function getQuestion(qid, username, ip, update){
    let question = undefined;
    if (update){
        let dbResult = await updateViewCount(qid, username, ip);
        question = dbResult.data;
    }
    // if update:
    //      if updateViewCount returned undefined, question could not be found
    //          no need to searcha again
    //      if updateViewCount returned a response, question will not be null
    //  else:
    //      try searching for the question
    if (question === undefined){
        try {
            question = await client.get({
                id: qid,
                index: INDEX_QUESTIONS,
                type: "_doc",
                // refresh: "true"
            });
        } catch(err){
            console.log(`[QA] getQuestion ${qid} not found.`);
        }
    }
    if (question != null){
        let question_views = (await client.search({
            index: INDEX_VIEWS,
            body: {
                query: {
                    term: {
                        "qid.keyword": qid
                    }
                }
            }
        })).hits.hits[0];
        return {status: constants.DB_RES_SUCCESS, data: question, views: question_views};
    }
    return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
}

/** POST /questions/:qid/answers/add
 * Adds an Answer to the specified Question.
 * 
 * Creates:
 *  1) in INDEX_ANSWERS, the Answer document
 *  2) in INDEX_A_UPVOTES, the Answer Upvotes metadata document
 * 
 * @param {string} qid the _id of the question
 * @param {string} user the user object
 * @param {string} body the body of the answer
 * @param {id[]} media array of media IDs attached to the answer
 * @param {id} id the id to use if specified
 */
async function addAnswer(qid, user, body, media, id, timestamp){
    let username = user._source.username;
    media = (media == undefined) ? [] : media;
    
    if (media.length > 0){
        // first, check that the media IDs specified 
        //       1) are not already associated with another Question or Answer document
        //       2) belong to the user trying to post the question
        let cassandraResp = await checkFreeMedia(media, user._source.username);
        if (cassandraResp.status != constants.DB_RES_SUCCESS){
            return new DBResult(constants.DB_RES_MEDIA_INVALID, null);
        }
    }

    // grab the Question document
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
        return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
    }

    let promises = [];
    let bulk_insert = { body: [] };
    let action_doc = undefined;
    let partial_doc = undefined;
    
    // create the Answer document
    id = (id == undefined) ? uuidv4() : id;
    // let answer = {
    //     index: INDEX_ANSWERS,
    //     type: "_doc",
    //     id: id,
    //     // refresh: "true",
    //     body: {
    //         "id": id,
    //         "qid": qid,
    //         "user": username,
    //         "body": body,
    //         "score": 0,
    //         "is_accepted": false,
    //         "timestamp": timestamp,
    //         "media": media
    //     }
    // };
    // let response = await client.index(answer);
    // if (!response || response.result !== "created"){
    //     console.log(`[QA] Failed to create Answer document with ${qid}, ${username}, ${body}, ${media}`);
    //     console.log(response);
    //     return new DBResult(constants.DB_RES_ERROR, response);
    // }
    action_doc = {
        index: {
            _index: INDEX_ANSWERS,
            _type: "_doc",
            _id: id
        }
    };
    partial_doc = {
        "id": id,
        "qid": qid,
        "user": username,
        "body": body,
        "score": 0,
        "is_accepted": false,
        "timestamp": timestamp,
        "media": media
    };
    bulk_insert.body.push(action_doc);
    bulk_insert.body.push(partial_doc);

    // create the Answer Upvote metadata document
    // let user_id = await getUserIDByName(username);
    let user_id = user._id;
    // let upvoteResponse = await client.index({
    //     index: INDEX_A_UPVOTES,
    //     type: "_doc",
    //     // refresh: "true",
    //     body: {
    //         "qid": qid,
    //         "aid": response._id,
    //         "user_id": user_id,   // needed to make DELETE easier
    //         "upvotes": [],
    //         "downvotes": [],
    //         "waived_downvotes": []
    //     }
    // });
    // if (upvoteResponse.result !== "created"){
    //     console.log(`[QA] Failed to create Answer document with ${qid}, ${username}, ${body}, ${media}`);
    //     console.log(upvoteResponse);
    // }
    action_doc = {
        index: {
            _index: INDEX_A_UPVOTES,
            _type: "_doc"
        }
    };
    partial_doc = {
        "qid": qid,
        "aid": response._id,
        "user_id": user_id,   // needed to make DELETE easier
        "upvotes": [],
        "downvotes": [],
        "waived_downvotes": []
    };
    bulk_insert.body.push(action_doc);
    bulk_insert.body.push(partial_doc);

    // assocaite the free media IDs with the new Answer
    let media_body = associateFreeMediaBulkBody(qid, media);
    bulk_insert.body = bulk_insert.body.concat(media_body);
    console.log(bulk_insert);

    let bulk_response = client.bulk(bulk_insert);
    promises.push(bulk_response);

    // modify the Question document
    let update_question_response = client.updateByQuery({
        index: INDEX_QUESTIONS,
        type: "_doc",
        // refresh: "true",
        body: { 
            query: { 
                term: { 
                    _id: qid
                } 
            }, 
            script: {
                lang: "painless",
                inline: "ctx._source.answer_count += 1"
            }
        }
    });
    promises.push(update_question_response);
    await Promise.all(promises);

    return new DBResult(constants.DB_RES_SUCCESS, response._id);
}

/** GET /questions/:qid/answers
 * Retrieves all Answers for the specified Question.
 * @param {string} qid the _id of the question
 */
async function getAnswers(qid){
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
        return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
    }

    // grab all Answer documents for the specified Question
    let answers = (await client.search({
        index: INDEX_ANSWERS,
        size: 10000,
        body: {
            query: {
                term: {
                    "qid.keyword": qid
                }
            }
        }
    })).hits.hits;

    return new DBResult(constants.DB_RES_SUCCESS, answers);
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
    const getRes = await getQuestion(qid, username);
    let response = undefined;
    if (getRes.status === constants.DB_RES_Q_NOTFOUND){
        return getRes;
    }
    let question = getRes.data;
    let media_ids = question._source.media;
    console.log(`[QA] deleteQuestion qid=${qid}, media=${media_ids}`);

    // If the DELETE operation was specified by the original asker, then delete
    if (username == question._source.user.username){
        let promises = [];

        // 2) DELETE from INDEX_VIEWS the Question Views metadata document
        let delete_views_response = client.deleteByQuery({
            index: INDEX_VIEWS,
            type: "_doc",
            body: { 
                query: { 
                    term: { 
                        "qid.keyword": qid
                    } 
                }, 
            }
        });
        promises.push(delete_views_response);

        // 3) DELETE from INDEX_Q_UPVOTES the Question Upvotes metadata document
        //      but first, undo the effect of all votes on reputation of the asker
        
        // let undoQuestionVotesResp = await undoAllQuestionVotes(qid);
        // if (undoQuestionVotesResp.status !== constants.DB_RES_SUCCESS ||
        //     undoQuestionVotesResp.status !== constants.DB_RES_Q_NOTFOUND){
        //     console.log(`[QA] Failed to undo all question votes`);
        // }
        let delete_upvotes_response = client.deleteByQuery({
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
        promises.push(delete_upvotes_response);

        // 5) DELETE from INDEX_A_UPVOTES the Answer Upvotes metadata document
        //      but first, undo the effect of all votes on reputation of the answerers
        
        // let undoAnswerVotesResp = await undoAllAnswerVotes(qid);
        // if (undoAnswerVotesResp.status !== constants.DB_RES_SUCCESS || 
        //     undoAnswerVotesResp.status !== constants.DB_RES_Q_NOTFOUND){
        //     console.log(`[QA] Failed to undo all answer votes`);
        // }
        let delete_answer_upvotes_response = client.deleteByQuery({
            index: INDEX_A_UPVOTES,
            type: "_doc",
            body: {
                query: {
                    term: {
                        "qid.keyword": qid
                    }
                }
            }
        });
        promises.push(delete_answer_upvotes_response);

        // 6) DELETE any associated media documents
        //      it suffices to delete all media associated with QID as all media associated to its Answers
        //      have their associated ID field set to QID instead of AID to optimize deletion
        let answerMedia = await getAnswerMedia(qid);    // this needs to be awaited
        console.log(`>>>>>> [ANSWER MEDIA]: ${answerMedia}`);
        for (let answerId of answerMedia) {
            media_ids.push(answerId);
        }
        let delete_media_response = deleteArrOfMedia(media_ids);
        promises.push(delete_media_response);
        

        // 4) DELETE from INDEX_ANSWERS any associated Answer documents
        let delete_answers_response = client.deleteByQuery({
            index: INDEX_ANSWERS,
            type: "_doc",
            body: {
                query: {
                    term: {
                        "qid.keyword": qid
                    }
                }
            }
        });
        promises.push(delete_answers_response);

        // 1) DELETE from INDEX_QUESTIONS the Question document
        let delete_question_response = client.deleteByQuery({
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
        promises.push(delete_question_response);
        await Promise.all(promises);
        console.log(`[QA] deleted question ${qid}`);
        return new DBResult(constants.DB_RES_SUCCESS, null);
    }
    else {
        return new DBResult(constants.DB_RES_NOT_ALLOWED, null);
    }
}

/* milestone 3 */

/**
 * Undoes the effect of ALL Answers' votes associated with a specified Question on the poster's reputation.
 * @param {string} qid the _id of the associated Question
 */
async function undoAllAnswerVotes(qid){
    // grab the associated Upvotes document
    let qa_votes = (await client.search({
        index: INDEX_A_UPVOTES,
        body: {
            query: {
                term: {
                    "qid.keyword": qid
                }
            }
        }
    })).hits.hits;

    if (qa_votes.length == 0){
        return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
    }

    // aggregate the updates that need to be made to every user who answered the question
    let undo_votes = {};
    let poster = undefined;
    let rep_diff = 0;
    let upvotes = undefined;
    let downvotes = undefined;
    for (var ans of qa_votes){
        poster = ans._source.user_id;
        upvotes = (ans._source.upvotes == undefined) ? [] : ans._source.upvotes;
        downvotes = (ans._source.downvotes == undefined) ? [] : ans._source.downvotes;
        rep_diff = -(upvotes.length - downvotes.length);
        if (poster in undo_votes){
            undo_votes[poster] += rep_diff;
        }
        else {
            undo_votes[poster] = rep_diff;
        }
    }

    // build the bulk query that will update every User document
    let bulk_query = { body : []};
    let action_doc = undefined;
    let update_doc = undefined;
    let param_rep_diff = "rep_diff";
    let inline_script = `ctx._source.reputation += params.${param_rep_diff}`;
    for (var user_id in undo_votes){
        rep_diff = undo_votes[user_id];
        if (rep_diff == 0){
            continue;
        }
        action_doc = {
            update: {
                _index: INDEX_USERS,
                _type: "_doc",
                _id: user_id
            }
        };
        update_doc = {
            script: {
                lang: "painless",
                inline: inline_script,
                params: {
                    [param_rep_diff]: rep_diff
                }
            }
        };
        bulk_query.body.push(action_doc);
        bulk_query.body.push(update_doc);
    }
    let bulkResponse = null;
    if (bulk_query.body.length > 0){
        bulkResponse = await client.bulk(bulk_query);
        // console.log(`[QA]Bulk performed... ${JSON.stringify(bulk_query.body)}`);
        // console.log(`[QA]Bulk response... ${JSON.stringify(bulkResponse)}`);
    }

    return new DBResult(constants.DB_RES_SUCCESS, bulkResponse);
}

/** helper for DELETE /questions/:qid
 * Undoes the effect of ALL votes associated with a specified Question on the asker's reputation.
 * @param {string} qid the _id of the Question
 */
async function undoAllQuestionVotes(qid){
    // grab the associated Upvotes document
    let qa_votes = (await client.search({
        index: INDEX_Q_UPVOTES,
        body: {
            query: {
                term: {
                    "qid.keyword": qid
                }
            }
        }
    })).hits.hits[0];

    if (qa_votes == undefined){
        return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
    }

    let upvotes = (qa_votes._source.upvotes == undefined) ? [] : qa_votes._source.upvotes;
    let downvotes = (qa_votes._source.downvotes == undefined) ? [] : qa_votes._source.downvotes;
    let rep_diff = -(upvotes.length - downvotes.length);
    if (rep_diff == 0){
        return new DBResult(constants.DB_RES_SUCCESS, null);
    }
    
    let poster = await getUserByPost(qid, undefined);
    let updateRepRes = await updateReputation(poster, rep_diff);
    if (updateRepRes.status === constants.DB_RES_SUCCESS){
        return new DBResult(constants.DB_RES_SUCCESS, updateRepRes);
    }
    console.log(`[QA] Failed updateReputation in undoAllQuestionVotes(${qid})`);
    return new DBResult(constants.DB_RES_ERROR, updateRepRes);
}

/** helper for POST /questions/:qid/upvote and POST /answers/:aid/upvote
 * Undoes a user's vote for a specified Question or Answer.
 * @param {string} qid the _id of the question (if used for undoing the vote to a question)
 * @param {string} aid the _id of the answer (if used for undoing the vote to an answer)
 * @param {string} username the user who wishes to undo his vote for the question/answer
 * @param {boolean} upvote whether the user's vote is in upvotes or downvotes
 * @param {boolean} waived whether or not the user's downvote was waived (only valid if !upvote)
 */
function undoVote(qid, aid, username, upvote, waived){
    let which_index = (aid == undefined) ? INDEX_Q_UPVOTES : INDEX_A_UPVOTES;
    let which_id = (aid == undefined) ? "qid.keyword" : "aid.keyword";
    let which_id_value = (aid == undefined) ? qid : aid;
    let arr = (upvote) ? "upvotes" : "downvotes";
    if (!upvote && waived){
        arr = "waived_" + arr;
    }
    let inline_script = `if (ctx._source.${arr}.indexOf(params.user) != -1) { ctx._source.${arr}.remove(ctx._source.${arr}.indexOf(params.user)); }`
    return client.updateByQuery({
        index: which_index,
        type: "_doc",
        // refresh: "true",
        conflicts: "proceed",
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
                    user: username
                }
            }
        }
    });
    // let success = (undoVoteResponse.updated == 1) ? constants.DB_RES_SUCCESS : constants.DB_RES_ERROR;
    // if (success !== constants.DB_RES_SUCCESS){
    //     console.log(`[QA] Failed undoVote(${qid}, ${aid}, ${username}, ${upvote})`);
    // }
    // return new DBResult(constants.DB_RES_SUCCESS, null);
}

/** helper for POST /questions/:qid/upvote and POST /answers/:aid/upvote
 * Adds a user's vote to the specified Question or Answer.
 * @param {string} qid the _id of the question (if used for adding the vote to a question)
 * @param {string} aid the _id of the answer (if used for adding the vote to an answer)
 * @param {string} username the user who wishes to add his vote for the question/answer
 * @param {boolean} upvote whether the user's vote is to upvote or downvote
 * @param {boolean} waived whether the user's downvote should be waived
 */
function addVote(qid, aid, username, upvote, waived){
    let which_index = (aid == undefined) ? INDEX_Q_UPVOTES : INDEX_A_UPVOTES;
    let which_id = (aid == undefined) ? "qid.keyword" : "aid.keyword";
    let which_id_value = (aid == undefined) ? qid : aid;
    let arr = (upvote) ? "upvotes" : "downvotes";
    if (!upvote && waived){
        arr = "waived_" + arr;
    }
    let inline_script = `if (ctx._source.${arr}.indexOf(params.user) == -1) { ctx._source.${arr}.add(params.user); }`
    return client.updateByQuery({
        index: which_index,
        type: "_doc",
        // refresh: "true",
        conflicts: "proceed",
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
                    user: username
                }
            }
        }
    });
    // let success = (addVoteResponse.updated == 1) ? constants.DB_RES_SUCCESS : constants.DB_RES_ERROR;
    // if (success !== constants.DB_RES_SUCCESS){
    //     console.log(`[QA] Failed addVote(${qid}, ${aid}, ${username}, ${upvote})`);
    // }
    // return new DBResult(constants.DB_RES_SUCCESS, null);
}

/** helper for POST /questions/:qid/upvote and POST /answers/:aid/upvote
 * Updates the score of a specified Question or Answer by the amount.
 * @param {string} qid the _id of the question (if used for updating the score of a question)
 * @param {string} aid the _id of the answer (if used for updating the score of an answer)
 * @param {integer} amount the amount by which to add to the current score of the question or answer
 */
function updateScore(qid, aid, amount){
    let which_index = (aid == undefined) ? INDEX_QUESTIONS : INDEX_ANSWERS;
    let id_value = (aid == undefined) ? qid : aid;
    let inline_script = `ctx._source.score += params.amount`
    return client.updateByQuery({
        index: which_index,
        type: "_doc",
        // refresh: "true",
        conflicts: "proceed",
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
                    amount: amount
                }
            } 
        }
    });
    // let success = (updateResponse.updated == 1) ? constants.DB_RES_SUCCESS : constants.DB_RES_ERROR;
    // if (success !== constants.DB_RES_SUCCESS){
    //     console.log(`[QA] Failed updateScore(${qid}, ${aid}, ${amount})`);
    // }
    // return new DBResult(constants.DB_RES_SUCCESS, null);
}

/**
 * Updates the reputation of a User by the specified amount.
 * 
 * Needs to update the reputation of the User document as well as the associated Question documents.
 * @param {string} username username of the user
 * @param {id} qid id of the question if for question
 * @param {int} amount amount by which to update the reputation
 */
async function updateReputation(username, qid, score_diff, amount){
    if (score_diff == 0 && amount == 0){
        return false;
    }
    let inline_script = `ctx._source.reputation += params.amount`;
    let promises = [];
    
    let poster_rep = await getReputation(username);
    let waived = false;
    if (poster_rep + amount < 1){
        waived = true;
        // later we do poster_rep + (rep_diff) = poster_rep + (1 - poster_rep) = 1
        amount = 1 - poster_rep;
    }
    let params = {
        amount : amount
    };
    if (amount != 0){
        let update_user_promise = client.updateByQuery({
            index: INDEX_USERS,
            type: "_doc",
            // refresh: "true",
            conflicts: "proceed",
            body: { 
                query: { 
                    match: { 
                        "username": username
                    } 
                }, 
                script: { 
                    lang: "painless",
                    inline: inline_script,
                    params: params
                } 
            }
        });
        promises.push(update_user_promise);
    }
    
    // let success = (updateUserResponse.updated == 1) ? constants.DB_RES_SUCCESS : constants.DB_RES_ERROR;
    // if (success !== constants.DB_RES_SUCCESS){
    //     console.log(`[QA] Failed updateUserReputation(${username}, ${amount})`);
    // }
    if (qid == undefined){
        inline_script = `ctx._source.user.reputation += params.amount`;
        params = {
            amount: amount
        };
    }
    else {
        inline_script = `ctx._source.user.reputation += params.amount; if (ctx._source.id == params.qid) { ctx._source.score += params.score_diff }`;
        params = {
            amount: amount,
            score_diff: score_diff,
            qid: qid
        }
    }
    
    let update_question_promise = client.updateByQuery({
        index: INDEX_QUESTIONS,
        size: 10000,
        type: "_doc",
        // refresh: "true",
        conflicts: "proceed",
        body: { 
            query: { 
                match: { 
                    "user.username": username
                } 
            }, 
            script: { 
                lang: "painless",
                inline: inline_script,
                params: params
            } 
        }
    });
    promises.push(update_question_promise);
    await Promise.all(promises);
    return waived;
    // let success2 = (updateQResponse.updated >= 1) ? constants.DB_RES_SUCCESS : constants.DB_RES_ERROR;
    // if (success2 !== constants.DB_RES_SUCCESS){
    //     console.log(`[QA] Failed updateQReputation(${username}, ${amount})`);
    // }
    // return new DBResult(constants.DB_RES_SUCCESS, null);
}

function handleVote(qid, aid, username, in_upvotes, waived, upvote, waive_vote, undo_vote, add_vote){
    if (add_vote === false){
        return undoVote(qid, aid, username, in_upvotes, waived);
    }
    else if (undo_vote === false){
        return addVote(qid, aid, username, upvote, waive_vote);
    }
    else if (undo_vote === true && add_vote === true){
        let which_index = (aid == undefined) ? INDEX_Q_UPVOTES : INDEX_A_UPVOTES;
        let which_id = (aid == undefined) ? "qid.keyword" : "aid.keyword";
        let which_id_value = (aid == undefined) ? qid : aid;
        // find which array the name was in previously
        let undo_arr = (in_upvotes) ? "upvotes" : "downvotes";
        if (!in_upvotes && waived){
            undo_arr = "waived_" + undo_arr;
        }
        // find which array to add the vote to
        let add_arr = (upvote) ? "upvotes" : "downvotes";
        if (!upvote && waive_vote){
            add_arr = "waived_" + add_arr;
        }
        let param_user = "user";
        let inline_script = `if (ctx._source.${undo_arr}.indexOf(params.user) != -1) { ctx._source.${undo_arr}.remove(ctx._source.${undo_arr}.indexOf(params.user)); } if (ctx._source.${add_arr}.indexOf(params.user) == -1) { ctx._source.${add_arr}.add(params.user); }`;
        // let inline_script = `ctx._source.${undo_arr}.remove(ctx._source.${undo_arr}.indexOf(params.${param_user})); ctx._source.${add_arr}.add(params.${param_user})`;
        return client.updateByQuery({
            index: which_index,
            type: "_doc",
            // refresh: "true",
            conflicts: "proceed",
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
        // console.log(handleVoteResponse);
        // return new DBResult(constants.DB_RES_SUCCESS, null);
    }
    console.log(`[QA] handleVote ${undo_vote}, ${add_vote} triggered`);
    return null;
}

/**
 * Up/downvotes the specified Question or Answer according to the user.
 * @param {string} qid the _id of the question (if used for adding the vote to a question)
 * @param {string} aid the _id of the answer (if used for adding the vote to an answer)
 * @param {string} username the user who wishes to add his vote for the question/answer
 * @param {boolean} upvote whether the user's vote is to upvote or downvote
 */
async function upvoteQA(qid, aid, username, upvote){
    console.log(`[QA] upvoteQA ${qid}, ${aid}, ${username}, ${upvote}`);
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
            return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
        }
        else {
            return new DBResult(constants.DB_RES_A_NOTFOUND, null);
        }
    }

    // first check if there are any elements in the upvotes and downvotes
    //      ElasticSearch treats them as missing fields if they are empty
    let upvotes = (qa_votes._source.upvotes == undefined) ? [] : qa_votes._source.upvotes;
    let downvotes = (qa_votes._source.downvotes == undefined) ? [] : qa_votes._source.downvotes;
    let waived_downvotes = (qa_votes._source.waived_downvotes == undefined) ? [] : qa_votes._source.waived_downvotes;
    
    // check if the user downvoted or upvoted the question
    let score_diff = 0;     // the difference in the "score" of a question
    let rep_diff = 0;       // the difference in the "reputation" of a user which must be >= 1
    let upvoted = upvotes.includes(username);
    let downvoted  = downvotes.includes(username);
    let waived = waived_downvotes.includes(username);
    let poster = await getUserByPost(qid,aid);
    let promises = [];

    let in_upvotes = false;
    let undo_vote = false;
    let add_vote = false;

    // if the user already voted, undo the vote
    //      calculate the difference to the poster's reputation and score of the post
    if (upvoted || downvoted || waived){
        in_upvotes = (upvoted) ? true : false;

        // Remember, downvotes are waived for USER REPUTATION, not POST SCORE
        // if the vote was waived, then rep_diff = 0, score_diff = 1
        //      else if it was upvoted, then rep_diff = score_diff = -1
        //      else if it was downvoted, then rep_diff = score_diff = 1
        rep_diff = (waived) ? 0 : ((upvoted) ? -1 : 1);
        score_diff = (waived) ? 1 : ((upvoted) ? -1 : 1);
        undo_vote = true;
        // console.log(`[QA] undoing vote by ${poster}`);
        // promises.push(undoVote(qid,aid,username,in_upvotes,waived));
    }

    // if it's NOT just undoing a previous action, we have to calculate the effect of the new vote
    //      on the poster's reputation and the score of the post
    if (!((upvote && upvoted) || (!upvote && downvoted) || (!upvote && waived))){
        // add the vote's effect onto rep_diff and score_diff
        rep_diff = (upvote) ? rep_diff + 1 : rep_diff - 1;
        score_diff = (upvote) ? score_diff + 1 : score_diff - 1;
        add_vote = true;
    }

    // if it's for a question, updateReputation will handle it
    if (qid == undefined){
        // update the score of the question or answer
        promises.push(updateScore(qid, aid, score_diff));
    }
    // update the reputation of the poster
    let waive_vote = updateReputation(poster, qid, score_diff, rep_diff);

    // update the votes accordingly
    promises.push(handleVote(qid, aid, username, in_upvotes, waived, upvote, waive_vote, undo_vote, add_vote));
    await Promise.all(promises);
    return new DBResult(constants.DB_RES_SUCCESS, null);

    // if the user asked to perform the same operation, all we needed to do was undo the previous vote
    //      1) remove the vote from the corresponding vote array of the post
    //      2) update the score
    //      3) update the reputation
    // if ((upvote && upvoted) || (!upvote && downvoted)){
    //     return new DBResult(constants.DB_RES_SUCCESS, null);
    // }

    // add the vote to the post
    // console.log(`[QA] adding vote ${qid}, ${aid}, ${username}, ${upvote}, ${waive_vote}`);
    // let addVoteRes = await addVote(qid, aid, username, upvote, waive_vote);
    // if (addVoteRes.status !== constants.DB_RES_SUCCESS){
    //     console.log(`[QA] Failed addVote in upvoteQA(${qid}, ${aid}, ${username}, ${upvote})`);
    // }
    // await addVote(qid, aid, username, upvote, waive_vote);
    // promises.push(addVote(qid, aid, username, upvote, waive_vote));
    // return new DBResult(constants.DB_RES_SUCCESS, null);
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
        return new DBResult(constants.DB_RES_A_NOTFOUND, null);
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
        return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
    }

    // if the user is the original asker, update the Question and Answer documents
    if (username == question._source.user.username){
        // check that the Question does not already have an accepted answer
        if (question._source.accepted_answer_id != null){
            return new DBResult(constants.DB_RES_ALRDY_ACCEPTED, null);
        }

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
            // refresh: "true",
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
            console.log(`[QA] Failed to update Question ${qid}'s accepted answer to ${aid}`);
            console.log(updateQuestionResponse);
        }

        // update the Answer document's "is_accepted" field
        const updateAnswerResponse = await client.updateByQuery({
            index: INDEX_ANSWERS,
            type: "_doc",
            // refresh: "true",
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
            console.log(`[QA] Failed to update Answer ${aid}'s is_accepted field to true`);
            console.log(updateAnswerResponse);
        }
        return new DBResult(constants.DB_RES_SUCCESS, null);
    }
    else {
        return new DBResult(constants.DB_RES_NOT_ALLOWED, null);
    }
}

async function getAnswerMedia(qid) {
    const answers = (await getAnswers(qid)).data;
    let answerMedia = [];

    for (let answer of answers) {
        let mediaIds = answer._source.media;
        for (let mediaId of mediaIds) {
            answerMedia.push(mediaId);
        }
    }

    return answerMedia;
}


module.exports = {
    shutdown: shutdown,
    // getQuestionsByUser: getQuestionsByUser,
    addQuestion: addQuestion,
    getQuestion: getQuestion,
    deleteQuestion: deleteQuestion,
    addAnswer: addAnswer,
    getAnswers: getAnswers,
    upvoteQuestion: upvoteQuestion,
    upvoteAnswer: upvoteAnswer,
    acceptAnswer: acceptAnswer
};