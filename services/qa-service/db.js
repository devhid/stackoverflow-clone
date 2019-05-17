/* library imports */
const MongoClient = require('mongodb').MongoClient;
const elasticsearch = require('elasticsearch');
const MUUID = require('uuid-mongodb');
const debug = require('debug');
const assert = require('assert');
const cassandra = require('cassandra-driver');

/* internal imports */
const constants = require('./constants');
const util = require('./util');
const DBResult = require('./dbresult').DBResult;

/* log function: `DEBUG=mongo:qa node index.js` */
const logMongo = debug('mongo:qa');
const logCassandra = debug('cassandra:qa');

/* database reference */
let db = null;

/* connect to mongodb and set reference to database object */
MongoClient.connect(constants.MONGODB_OPTIONS.host, {"useNewUrlParser": true}, function(err, client) {
    if (err) {
        logMongo(`[Error] MongoClient.connect() - ${err}`);
    } else {
        logMongo("Successfully connected.");
        db = client.db(constants.MONGODB_OPTIONS.database);
    }
});

/* client to communicate with elasticsearch */
const elasticClient = new elasticsearch.Client(constants.ELASTICSEARCH_OPTIONS);

/* connect to cassandra */
const cassandraOptions = constants.CASSANDRA_OPTIONS;
const cassandraClient = new cassandra.Client(cassandraOptions);
cassandraClient.connect()
    .then(() => {
        logCassandra(`Successfully established connection to keyspace, '${cassandraOptions.keyspace}'.`)
    }).catch((error) => {
        logCassandra(`[Error] Could not connect to keyspace, '${cassandraOptions.keyspace}'.`);
        logCassandra(`[Error] cassandraClient.connect() - ${error}`)
    });

/**
 * Closes cassandra connection.
 */
function closeCassandra() {
    cassandraClient.shutdown();
}

async function addQuestion() {

}

async function getQuestion() {

}

async function deleteQuestion() {

}

/**
 * 
 * @param {string} qid the _id of the Question (MUUID.toString())
 * @param {object} user the user object
 * @param {string} body the body of the answer
 * @param {string[]} media array of media IDs attached to the answer
 * @param {string} aid the _id of the Answer if specified
 * @param {Number} timestamp the UTC timestamp
 */
async function addAnswer(qid, user, body, media, aid, timestamp) {
    // check if the question exists
    let qidBinary = MUUID.from(qid);
    let questionExists = await questionExists(qidBinary);
    if (questionExists === false) {
        return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
    }

    // check if the media is free to use and belongs to user
    let media = (media == null) ? [] : media;
    let mediaAvailability = await checkMediaAvailablity(media);
    if (mediaAvailability === false) {
        return new DBResult(constants.DB_RES_MEDIA_INVALID, null);
    }
    let mediaValidity = await validateMedia(media, user.username);
    if (mediaValidity === false) {
        return new DBResult(constants.DB_RES_MEDIA_INVALID, null);
    }

    // now we can create the appropriate documents
    let aidBinary = (aid == null) ? MUUID.v4() : MUUID.from(aid);
    timestamp = (timestamp == null) ? Date.now()/1000 : timestamp;
    let createAnswer = initializeAnswer(qidBinary, user, body, media, aidBinary, timestamp);
    let createMedia = initializeMedia(media);
    let createUpvotes = initializeUpvotes(aidBinary, constants.COLLECTIONS.A_UPVOTES);
    let updateAnswerCount = incrementAnswerCount(qidBinary);
    let allOperations = await Promise.all([createAnswer, createMedia, createUpvotes, updateAnswerCount]);

    return new DBResult(constants.DB_RES_SUCCESS, aidBinary.toString());
}

/**
 * Retrieves all Answers for the specified Question.
 * @param {string} qid the _id of the question
 */
async function getAnswers(qid) {
    // check if the question exists
    let qidBinary = MUUID.from(qid);
    let questionExists = await questionExists(qidBinary);
    if (questionExists === false) {
        return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
    }

    // grab all answer documents for the specified question
    let answers = [];
    try {
        answers = await db.collection(constants.COLLECTIONS.ANSWERS).find({"qid": qidBinary})
    } catch (err) {
        // do nothing
    }
    
    return new DBResult(constants.DB_RES_SUCCESS, answers);
}

/** POST /questions/:qid/upvote
 * Up/downvotes the specified Question according to the user.
 *      If the user has already 'upvoted' the question and it is the same operation, it will be undone.
 *      If the user chooses the opposite of what was previously selected, it will overwrite it.
 * @param {string} qid the _id of the question
 * @param {string} username the user who wishes to 'upvote' the question
 * @param {boolean} upvote whether to upvote or downvote the question
 */
async function upvoteQuestion(qid, user, upvote) {
    // NOTE: we do NOT await here as we return another async function
    return upvoteQA(qid, undefined, user.username, upvote);
}

/** POST /answers/:aid/upvote
 * Up/downvotes the specified Answer accoring to the user.
 *      If the user has already 'upvoted' the answer and it is the same operation, it will be undone.
 *      If the user chooses the opposite of what was previously selected, it will overwrite it.
 * @param {string} aid the _id of the answer
 * @param {string} username the user who wishes to 'upvote' the answer
 * @param {boolean} upvote whether to upvote or downvote the answer
 */
async function upvoteAnswer(aid, user, upvote) {
    // NOTE: we do NOT await here as we return another async function
    return upvoteQA(undefined, aid, user.username, upvote);
}

async function acceptAnswer(aid, username) {
    const answer = await getAnswerDocument(aid);
    const question = await getQuestionDocument(answer.qid);

    if (!isOriginalPoster(question, username)) {
        // set status and error and return DBResult
    } 

    if (isAccepted(question)) {
        // set status and error and return DBResult
    }

    markAnswered(aid);

    // return successful DBResult
}

/******* Helper Functions *******/

function initializeQuestion(user, title, body, media, tags, id, timestamp) {    
    const questionDocument = {
        "_id": id,
        "user": {
            "username": user.username,
            "reputation": user.reputation
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

    return new Promise((resolve, reject) => {
        db.collection(constants.COLLECTIONS.QUESTIONS).insertOne(questionDocument, function(err, response) {
            if (err) {
                logMongo(`[Error] initializeQuestion() - ${err}`);
                reject(err);
            } else {
                logMongo(`initalizeQuestion() - ${response}`);
                resolve(id);
            }
        });
    });
}

function initializeView(qid) {
    const viewDocument = {
        "_id": qid,
        "authenticated": [],
        "unauthenticated": []
    };

    return new Promise((resolve, reject) => {
        db.collection(constants.COLLECTIONS.VIEWS).insertOne(viewDocument, function(err, response) {
            if (err) {
                logMongo(`[Error] initializeView() - ${err}`);
                reject(err);
            } else {
                logMongo(`initalizeView() - ${response}`);
                resolve(response);
            }
        });
    });
}

function initializeUpvotes(qa_id, collection) {
    const upvotesDocument = {
        "_id": qa_id,
        "upvotes": [],
        "downvotes": [],
        "waived_downvotes": []
    };

    return new Promise((resolve, reject) => {
        db.collection(collection).insertOne(upvotesDocument, function(err, response) {
            if (err) {
                logMongo(`[Error] initializeUpvotes() - ${err}`);
                reject(err);
            } else {
                logMongo(`initalizeUpvotes() - ${result}`);
                resolve(response);
            }
        });
    });
}

/**
 * Creates the media documents associated with a specified question or answer.
 * @param {string[]} media array of media IDs
 * @param {string} qa_id the string _id of a question or answer
 */
function initializeMedia(media, qa_id) {
    let insertOperations = [];
    for (let mediaId of media) {
        let mediaDocument = {
            "_id": MUUID.from(mediaId),
            "qa_id": qa_id
        };
        let insertDocument = {
            "insertOne": {
                "document": mediaDocument
            }
        }
        insertOperations.push(insertDocument);
    }
    return new Promise((resolve, reject) => {
        db.collection(constants.COLLECTIONS.MEDIA).bulkWrite(insertOperations, function(err, response) {
            if (err) {
                logMongo(`[Error] initializeMedia() - ${err}`);
                reject(err);
            } else {
                logMongo(`initializeMedia() - ${response}`);
                resolve(response);
            }
        });
    });
}

/**
 * Creates an Answer document in Mongo.
 * @param {string} qid the _id of the question
 * @param {object} user the user object
 * @param {string} body the body of the answer
 * @param {string[]} media array of media IDs attached to the answer
 * @param {string} aid the _id to use
 * @param {Number} timestamp the UTC timestamp to insert
 */
function initializeAnswer(qid, user, body, media, aid, timestamp) {
    const answerMongoDocument = {
        "_id": aid,
        "qid": qid,
        "user": user.username,
        "body": body,
        "score": 0,
        "is_accepted": false,
        "timestamp": timestamp,
        "media": media
    };

    return new Promise((resolve, reject) => {
        db.collection(constants.COLLECTIONS.ANSWERS).insertOne(answerDocument, function(err, response) {
            if (err) {
                logMongo(`[Error] initializeAnswer() - ${err}`);
                reject(err);
            } else {
                logMongo(`initializeAnswer() - ${response}`);
                resolve(aid);
            }
        });
    });
}

/**
 * Marks a question as answered and updates the question and answer documents accordingly.
 *      A question document's (associated with the specified qid) 'accepted_answer_id' field 
 *          is updated with the id of the accepted answer.
 * 
 *      The answer document's (associated with the specified aid) 'is_accepted' field 
 *          is set to true.
 * 
 * @param {string} qid 
 * @param {string} aid 
 */
async function markAnswered(aid) {
    try {
        var updated = await db.collection(constants.COLLECTIONS.ANSWERS).findOneAndUpdate({"id": aid}, {$set:{"is_accepted": true}}, {"returnNewDocument": true});
        logMongo(`markAnswered() - ${updated}`);
    } catch(err) {
        logMongo(`[Error] markAnswered() - ${err}`);
    }

    try {
        const result = await db.collection(constants.COLLECTIONS.QUESTIONS).updateOne({"id": updated.qid}, {$set:{"accepted_answer_id": aid}});
        logMongo(`markAnswered() - ${result}`);
    } catch(err) {
        logMongo(`[Error] markAnswered() - ${err}`);
    }
}

/**
 * Returns true, if the user with the specified username was the one who asked 
 *      the question, otherwise false.
 * 
 * @param {object} question 
 * @param {string} username 
 */
async function isOriginalPoster(question, username) {
    assert.notEqual(question, null);
    assert.notEqual(username, null);

    return question.user.username == username;
}

/**
 * Returns true if the question already has an accepted answer, false otherwise.
 * 
 * @param {object} question 
 */
function isAccepted(question) {
    return question.accepted_answer_id != null;
}

/**
 * Returns true if an answer exists by that ID, otherwise false.
 * 
 * @param {string} aid The ID of an answer.
 */
async function answerExists(aid) {
    try {
        var answer = await db.collection(constants.COLLECTIONS.ANSWERS).countDocuments(query={"id": aid}, options={"limit": 1});
        logMongo(`answerExists() - ${answer}`);
    } catch (err) {
        logMongo(`[Error] answerExists() - ${err}`);
    }

    return answer != 0;
}

/**
 * Returns true if an question exists by that ID, otherwise false.
 * 
 * @param {string} qid The ID of an question.
 */
async function questionExists(qid) {
    try {
        var question = await db.collection(constants.COLLECTIONS.QUESTIONS).countDocuments(query={"id": qid}, options={"limit": 1});
        logMongo(`questionExists() - ${question}`);
    } catch (err) {
        logMongo(`[Error] questionExists() - ${err}`);
    }

    return question != 0;
}

/**
 * Returns the full question document associated with the qid (question ID).
 * 
 * @param {string} qid The ID of a question.
 */
async function getQuestionDocument(qid) {
    try {
        var question = await db.collection(constants.COLLECTIONS.QUESTIONS).findOne({"id": qid});
        logMongo(`getQuestionDocument() - ${question}`);
    } catch (err) {
        logMongo(`[Error] getQuestionDocument() - $(err)`);
    }

    return question;
}

/**
 * Returns the full answer document associated with the answer (answer ID).
 * 
 * @param {string} aid The ID of a answer.
 */
async function getAnswerDocument(aid) {
    try {
        var answer = await db.collection(constants.COLLECTIONS.ANSWERS).findOne({"id": aid});
        logMongo(`getAnswerDocument() - ${answer}`);
    } catch (err) {
        logMongo(`[Error] getAnswerDocument() - ${err}`);
    }

    return answer;
}

/**
 * Returns the full upvotes document associated with the question or answer.
 * 
 * @param {string} qa_id the _id of a question or answer
 * @param {string} collection the collection to search in
 */
async function getUpvotesDocument(qa_id, collection) {
    try {
        var upvotes = await db.collection(collection).findOne({"_id": qa_id});
        logMongo(`getUpvotesDocument() - ${upvotes}`);
    } catch (err) {
        logMongo(`[Error] getUpvotesDocument() - ${err}`);
    }

    return upvotes;
}

/**
 * Returns true if the following conditions are met, otherwise false.
 *      1. All of the mediaIDs actually exist in the database.
 *      2. The specified poster has actually uploaded all of the specified media IDs.
 * 
 * @param {string[]} mediaIDs A JavaScript array of media IDs.
 * @param {string} poster The user who is providing these media IDs.
 */
async function validateMedia(mediaIDs, poster) {
    const preparedList = util.toPreparedList(mediaIDs);
    const query = `SELECT poster FROM ${constants.CASSANDRA_OPTIONS.keyspace}.${constants.CASSANDRA_OPTIONS.table} WHERE id in ${preparedList}`;

    try {
        var result = await cassandraClient.execute(query, [mediaIDs], {prepare: true});
    } catch (err) {
        logCassandra(`[Error] validateMedia() - ${err}`);
        return false;
    }

    /* this will fail if some media IDs specified in the question or answer do not exist in Cassandra */
    if (result.rowLength != mediaIDs.length) {
        logCassandra(`validateMedia() - Some media IDs were not found in Cassandra.`);
        return false;
    }

    /* checks if ALL of the media queried has a matching poster */
    for (var row of result.rows) {
        if (row.poster !== poster) {
            logCassandra(`validateMedia() - Specified poster, ${poster} did not match the one in Cassandra, ${row.poster}.`);
            return false;
        }
    }

    return true;
}

/**
 * Returns true if the media IDs are not used in any other question or answer, otherwise false.
 * 
 * @param {string[]} mediaIDs A JavaScript array of media IDs.
 */
async function checkMediaAvailablity(mediaIDs) {
    try {
        const result = db.collection(constants.COLLECTIONS.MEDIA).find({"_id": {$in: mediaIDs}}).toArray();
        if (result.length != 0) {
            return false;
        }
    } catch (err) {
        logMongo(`[Error] checkMediaAvailablity() - ${err}`);
    }

    return true;
}

/**
 * Returns a JavaScript array of media IDs all associated with the question and its answers.
 * 
 * @param {string} qid The id of a question.
 */
async function getAssociatedMedia(qid) {
    const question = await getQuestionDocument(qid);
    const answers = await getAnswers(qid);

    let mediaIDs = question.media;
    for(let answer of answers) {
        mediaIDs.append(answer.media);
    }

    return mediaIDs;
}

/**
 * Deletes all media documents associated with the media IDs from Cassandra and MongoDB.
 * 
 * @param {string[]} mediaIDs 
 */
async function deleteMedia(mediaIDs) {

}

/**
 * Returns true if the user has not already contributed to the view count of a question.
 *      If a username is provided, this function will check if is already included
 *      in its view count.
 * 
 *      If the ip is provided, this function will check if is already included
 *      in its view count.
 * 
 *      Both username and ip cannot be provided and both cannot be null.
 *      Otherwise, this function will throw an Error.
 * 
 * @param {string} username The username of the user if authenticated, or null if an ip is provided.
 * @param {string} ip The IP address of the user is unauthenticated, or null if a username is provided.
 */
function checkUniqueView(qid, username, ip) {
    if (username == null && ip == null) { // '== null' is the same as checking if it is null or undefined
        throw Error("Both username and ip cannot be null.");
    }

    if (username && ip) {
        throw Error("Both username and ip cannot be non-null.");
    }
    
    try {
        const view = await db.collection(constants.COLLECTIONS.VIEWS).findOne({"qid": qid});
        if (view == null) {
            logMongo(`checkUniqueView() - No matching documents found for qid=${qid}.`);
        } else {
            if (username) {
                return view.authenticated.includes(username);
            } else {
                return view.unauthenticated.includes(ip);
            }
        }
    } catch(err) {
        logMongo(`[Error] checkUniqueView() - ${err}`);
    }
}

/**
 * Increments view count for a question by one.
 * 
 * @param {string} qid The id of the question.
 */
async function incrementViewCount(qid) {
    return new Promise((resolve, reject) => {
        db.collection(constants.COLLECTIONS.QUESTIONS).updateOne({"_id": qid}, {$inc: {"view_count": 1}}, function(err, response) {
            if (err) {
                logMongo(`[Error] incrementViewCount() - ${err}`);
                reject(err);
            } else {
                logMongo(`incrementViewCount() - ${response}`);
                resolve(response);
            }
        });
    });
}

async function incrementAnswerCount(qid) {
    return new Promise((resolve, reject) => {
        db.collection(constants.COLLECTIONS.QUESTIONS).updateOne({"_id": qid}, {$inc: {"answer_count": 1}}, function(err, response) {
            if (err) {
                logMongo(`[Error] incrementAnswerCount() - ${err}`);
                reject(err);
            } else {
                logMongo(`incrementAnswerCount() - ${response}`);
                resolve(response);
            }
        });
    });
}

/**
 * Returns the username associated with the question or answer.
 * 
 * @param {string} qa_id the _id of a question or answer
 * @param {string} collection the collection to search in
 */
async function getUsernameByPost(qa_id, collection) {
    try {
        var post = await db.collection(collection).findOne({"_id": qa_id});
        logMongo(`getUsernameByPost() - ${post}`);
    } catch (err) {
        logMongo(`[Error] getUsernameByPost() - ${err}`);
    }

    var username = null;
    if (collection === constants.COLLECTIONS.QUESTIONS) {
        username = post.user.username;
    }
    else if (collection === constants.COLLECTIONS.ANSWERS) {
        username = post.user;
    }

    return username;
}

/** /questions/:id/upvote, /answers/:id/upvote
 * Retrieves the "actual" reputation of a specified user.
 * @param {string} username the username of the user
 */
async function getReputation(username) {
    try {
        var user = await db.collection(constants.COLLECTIONS.USERS).findOne({"username": username});
        logMongo(`getUsernameByPost() - ${user}`);
    } catch (err) {
        logMongo(`[Error] getReputation() - ${err}`);
    }
    return user.reputation;
}


/**
 * Updates the score of a post and the reputation for a user.
 * @param {MUUID} qa_id the _id of the question or answer (binary)
 * @param {string} collection the collection in which the post belongs
 * @param {string} poster the username of the poster
 * @param {int} scoreDiff the difference in the score of the post
 * @param {int} repDiff the difference in the reputation of the user
 */
async function updateScoreReputation(qa_id, collection, poster, scoreDiff, repDiff) {
    let waived = false;
    if (scoreDiff == 0 && repDiff == 0) {
        return waived;
    }

    let promises = [];
    let posterReputation = await getReputation(poster);
    let newPosterReputation = posterReputation + repDiff;
    if (newPosterReputation < 1) {
        waived = true;
        newPosterReputation = 1;
    }

    // update the score of the post
    let updateScore = new Promise((resolve, reject) => {
        db.collection(collection).updateMany({"_id": qa_id}, {$inc: {"score": scoreDiff}}, function(err, response) {
            if (err) {
                logMongo(`[Error] updateScoreReputation() updateScore - ${err}`);
                reject(err);
            } else {
                logMongo(`updateScoreReputation() updateScore - ${response}`);
                resolve(response);
            }
        });
    });
    promises.push(updateScore);

    // update the user reputation in the Users collection
    let updateUserReputation = new Promise((resolve, reject) => {
        db.collection(constants.COLLECTIONS.USERS).updateOne({"username": poster}, {$set: {"reputation": newPosterReputation}}, function(err, response) {
            if (err) {
                logMongo(`[Error] updateScoreReputation() userReputation - ${err}`);
                reject(err);
            } else {
                logMongo(`updateScoreReputation() userReputation - ${response}`);
                resolve(response);
            }
        });
    });
    promises.push(updateUserReputation);

    // update the user reputation in all of their questions
    let updateQuestionsReputation = new Promise((resolve, reject) => {
        db.collection(constants.COLLECTIONS.QUESTIONS).updateMany({"user.username": poster}, {$set: {"reputation": newPosterReputation}}, function(err, response) {
            if (err) {
                logMongo(`[Error] updateScoreReputation() questionsReputation - ${err}`);
                reject(err);
            } else {
                logMongo(`updateScoreReputation() questionsReputation - ${response}`);
                resolve(response);
            }
        });
    });
    promises.push(updateQuestionsReputation);

    let allOperations = await Promise.all(promises);
    return waived;
}

/**
 * Handles undoing an old vote and adding a new vote by a user.
 * @param {MUUID} qa_id the _id of the question or answer (binary)
 * @param {string} collection the collection in which the post belongs
 * @param {string} username the username of the voter
 * @param {boolean} inUpvotes whether the user casted an upvote previously
 * @param {boolean} waived whether the user's previous vote was waived
 * @param {boolean} upvote whether the user wishes to upvote
 * @param {boolean} waiveVote whether the user's attempt to downvote should be waived
 * @param {boolean} undoVote whether the user's vote should be undone
 * @param {boolean} addVote whether the user's vote should be casted
 */
function handleVote(qa_id, collection, username, inUpvotes, waived, upvote, waiveVote, undoVote, addVote) {
    var updateObj = {};
    if (addVote === true) {
        let addArr = (upvote) ? "upvotes" : "downvotes";
        if (upvote === false && waiveVote === true) {
            addArr = "waived_" + addArr;
        }
        updateObj["$push"] = {
            [addArr] : username
        };
    }
    if (undoVote === true) {
        let undoArr = (inUpvotes) ? "upvotes" : "downvotes";
        if (inUpvotes === false && waived === true) {
            undoArr = "waived_" + undoArr;
        }
        updateObj["$pull"] = {
            [undoArr] : username
        };
    }
    return new Promise((resolve, reject) => {
        db.collection(collection).updateOne({"_id": qa_id}, updateObj, function(err, response) {
            if (err) {
                logMongo(`[Error] handleVote() - ${err}`);
                reject(err);
            } else {
                logMongo(`handleVote() - ${response}`);
                resolve(response);
            }
        });
    });
}

/**
 * Up/downvotes the specified Question or Answer according to the user.
 * @param {string} qid the _id of the question (if used for adding the vote to a question)
 * @param {string} aid the _id of the answer (if used for adding the vote to an answer)
 * @param {string} username the user who wishes to add his vote for the question/answer
 * @param {boolean} upvote whether the user's vote is to upvote or downvote
 */
async function upvoteQA(qid, aid, username, upvote) {
    let whichCollection = (aid == null) ? constants.COLLECTIONS.Q_UPVOTES : constants.COLLECTIONS.A_UPVOTES;
    let whichId = (aid == null) ? qid : aid;
    let whichIdBinary = MUUID.from(whichId);

    // check that the specified post exists
    let postExists = false;
    if (aid == null) {
        postExists = await questionExists(whichIdBinary);
    }
    else {
        postExists = await answerExists(whichIdBinary);
    }
    if (postExists === false) {
        if (aid == null) {
            return new DBResult(constants.DB_RES_Q_NOTFOUND, null);
        }
        else {
            return new DBResult(constants.DB_RES_A_NOTFOUND, null);
        }
    }

    // grab the upvotes document and extract the necessary information
    let upvotesDocument = await getUpvotesDocument(whichIdBinary, whichCollection);
    let upvotes = (upvotesDocument.upvotes == null) ? [] : upvotesDocument.upvotes;
    let downvotes = (upvotesDocument.downvotes == null) ? [] : upvotesDocument.downvotes;
    let waivedDownvotes = (upvotesDocument.waived_downvotes == null) ? [] : upvotesDocument.waived_downvotes;

    // check if the user downvoted or upvoted the question
    let scoreDiff = 0;     // the difference in the "score" of a question
    let repDiff = 0;       // the difference in the "reputation" of a user which must be >= 1
    let upvoted = upvotes.includes(username);
    let downvoted  = downvotes.includes(username);
    let waived = waived_downvotes.includes(username);
    let poster = await getUsernameByPost(whichIdBinary, whichCollection);

    let inUpvotes = false;
    let undoVote = false;
    let addVote = false;

    // if the user already voted, undo the vote
    //      calculate the difference to the poster's reputation and score of the post
    if (upvoted || downvoted || waived) {
        inUpvotes = (upvoted) ? true : false;

        // Remember, downvotes are waived for USER REPUTATION, not POST SCORE
        // if the vote was waived, then repDiff = 0, scoreDiff = 1
        //      else if it was upvoted, then repDiff = scoreDiff = -1
        //      else if it was downvoted, then repDiff = scoreDiff = 1
        repDiff = (waived) ? 0 : ((upvoted) ? -1 : 1);
        scoreDiff = (waived) ? 1 : ((upvoted) ? -1 : 1);
        undoVote = true;
    }

    // if it's NOT just undoing a previous action, we have to calculate the effect of the new vote
    //      on the poster's reputation and the score of the post
    if (!((upvote && upvoted) || (!upvote && downvoted) || (!upvote && waived))) {
        // add the vote's effect onto repDiff and scoreDiff
        repDiff = (upvote) ? repDiff + 1 : repDiff - 1;
        scoreDiff = (upvote) ? scoreDiff + 1 : scoreDiff - 1;
        addVote = true;
    }

    // cannot do this simultaneously as waiveVote is needed for handleVote
    let waiveVote = await updateScoreReputation(whichIdBinary, whichCollection, poster, scoreDiff, repDiff);
    let handleVote = await handleVote(whichIdBinary, whichCollection, username, inUpvotes, waived, upvote, waiveVote, undoVote, addVote);

    return new DBResult(constants.DB_RES_SUCCESS, null);
}

module.exports = {
    closeCassandra: closeCassandra
}