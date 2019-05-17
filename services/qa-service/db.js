/* library imports */
const MongoClient = require('mongodb').MongoClient;
const debug = require('debug');
const assert = require('assert');
const uuidv4 = require('uuid/v4');
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
    if(err) {
        logMongo(`[Error] MongoClient.connect() - ${err}`);
    } else {
        logMongo("Successfully connected.");
        db = client.db(constants.MONGODB_OPTIONS.database);
    }
});

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

async function addAnswer() {

}

async function getAnswers() {

}

async function upvoteQuestion() {

}

async function upvoteAnswer() {

}

async function acceptAnswer() {
    
}

/******* Helper Functions *******/

async function initializeQuestion(user, title, body, media, tags, id, timestamp) {    
    const questionDocument = {
        "id": id,
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

    try {
        const result = await db.collection(constants.COLLECTIONS.QUESTIONS).insertOne(questionDocument);
        log(`initalizeQuestion() - ${result}`);
    } catch(err) {
        log(`[Error] initializeQuestion() - ${err}`);
    }

    return id;
}

async function initializeView(id) {
    const viewDocument = {
        "qid": id,
        "authenticated": [],
        "unauthenticated": []
    };

    try {
        const result = await db.collection(constants.COLLECTIONS.VIEWS).insertOne(viewDocument);
        log(`initalizeView() - ${result}`);
    } catch(err) {
        log(`[Error] initializeView() - ${err}`);
    }
}

async function initializeQuestionUpvotes(id) {
    const upvotesDocument = {
        "qid": id,
        "upvotes": [],
        "downvotes": [],
        "waived_downvotes": []
    };

    try {
        const result = await db.collection(constants.COLLECTIONS.Q_UPVOTES).insertOne(upvotesDocument);
        log(`initalizeQuestionUpvotes() - ${result}`);
    } catch(err) {
        log(`[Error] initializeQuestionUpvotes() - ${err}`);
    }
}

async function initializeMedia(id) {
    const mediaDocument = {
        "qa_id": qa_id
    };

    try {
        const result = await db.collection(constants.COLLECTIONS.Q_UPVOTES).insertOne(upvotesDocument);
        log(`initalizeQuestionUpvotes() - ${result}`);
    } catch(err) {
        log(`[Error] initializeQuestionUpvotes() - ${err}`);
    }
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
async function markAnswered(qid, aid) {
    try {
        const result = db.collection(constants.COLLECTIONS.QUESTIONS).updateOne({"id": qid}, {$set:{"accepted_answer_id": aid}});
    } catch(err) {
        log(`[Error] markAnswered() - ${err}`);
    }

    try {
        const result = db.collection(constants.COLLECTIONS.ANSWERS).updateOne({"id": aid}, {$set:{"is_accepted": true}});
    } catch(err) {
        log(`[Error] markAnswered() - ${err}`);
    }
}

/**
 * Returns true, if the user with the specified username was the one who asked 
 *      the question with the specified qid, otherwise false.
 * 
 * @param {string} qid 
 * @param {string} username 
 */
async function isOriginalPoster(qid, username) {
    const question = await getQuestionDocument(qid);
    if(question == null) {
        let errorMsg = "Question is null.";
        throw new Error(errorMsg);
    }

    return question.user.username == username;
}

/**
 * Returns true if an answer exists by that ID, otherwise false.
 * 
 * @param {string} aid The ID of an answer.
 */
async function answerExists(aid) {
    try {
        var answer = await db.collection(constants.COLLECTIONS.ANSWERS).countDocuments(query={"id": aid}, options={"limit": 1});
        log(`answerExists() - ${answer}`);
    } catch(err) {
        log(`[Error] answerExists() - ${err}`);
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
        log(`questionExists() - ${question}`);
    } catch(err) {
        log(`[Error] questionExists() - ${err}`);
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
        log(`getQuestionDocument() - ${question}`)
    } catch(err) {
        log(`[Error] getQuestionDocument() - $(err)`);
    }

    return question;
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
        log(`[Error] validateMedia() - ${err}`);
        return false;
    }

    /* this will fail if some media IDs specified in the question or answer do not exist in Cassandra */
    if (result.rowLength != mediaIDs.length) {
        log(`validateMedia() - Some media IDs were not found in Cassandra.`);
        return false;
    }

    /* checks if ALL of the media queried has a matching poster */
    for (var row of result.rows) {
        if (row.poster !== poster) {
            log(`validateMedia() - Specified poster, ${poster} did not match the one in Cassandra, ${row.poster}.`);
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
        const result = db.collection(constants.COLLECTIONS.MEDIA).find({"id": {$in: mediaIDs}}).toArray();
        if(result.length != 0) {
            return false;
        }
    } catch(err) {
        log(`[Error] checkMediaAvailablity() - ${err}`);
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
    if(username == null && ip == null) { // '== null' is the same as checking if it is null or undefined
        throw Error("Both username and ip cannot be null.");
    }

    if(username && ip) {
        throw Error("Both username and ip cannot be non-null.");
    }
    
    try {
        const view = await db.collection(constants.COLLECTIONS.VIEWS).findOne({"qid": qid});
        if(view == null) {
            log(`checkUniqueView() - No matching documents found for qid=${qid}.`);
        } else {
            if(username) {
                return view.authenticated.includes(username);
            } else {
                return view.unauthenticated.includes(ip);
            }
        }
    } catch(err) {
        log(`[Error] checkUniqueView() - ${err}`);
    }
}

/**
 * Increments view count for a question by one.
 * 
 * @param {string} qid The id of the question.
 */
async function incrementViewCount(qid) {
    try {
        var newViewCount = await db.collection(constants.COLLECTIONS.QUESTIONS).findOne({"id": qid}) + 1;
        log(`incrementViewCount() - ${newViewCount}`)
    } catch(err) {
        log(`[Error] incrementViewCount() - ${err}`);
    }

    try {
        const result = await db.collection(constants.COLLECTIONS.QUESTIONS).updateOne({"id": qid}, {$set: {"view_count": newViewCount}});
        log(`incrementViewCount() - ${result}`)
    } catch(err) {
        log(`[Error] incrementViewCount() - ${err}`);
    }

    return newViewCount;
}


module.exports = {
    closeCassandra: closeCassandra
}