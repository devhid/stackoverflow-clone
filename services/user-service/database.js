/* library imports */
const elasticsearch = require('elasticsearch');

/* client to communicate with elasticsearch */
const client = new elasticsearch.Client({
    host: "http://admin:ferdman123@107.191.43.73:92"
});

/* indices for users, questions and answers in db */
const INDEX_QUESTIONS = "questions";  // INDEX_QUESTIONS is where questions are stored
const INDEX_USERS = "users";          // INDEX_USERS is where users are stored
const INDEX_ANSWERS = "answers";      // INDEX_ANSWERS is where answers are stored

/* get email and reputation of specified user */
async function getUser(username) {
    const user = (await client.search({
        index: INDEX_USERS,
        body: { query: { match: { "username": username } } }
    }))['hits']['hits'];

    if(user.length == 0) {
        return null;
    } else {
        let reputation = user[0]._source.reputation;
        reputation = (reputation < 1) ? 1 : reputation;
        return {
            "email": user[0]._source.email,
            "reputation": reputation
        }
    }
}

/* get all question ids for specified user */
async function getUserQuestions(username) {
    const questions = (await client.search({
        index: INDEX_QUESTIONS,
        size: 1000,
        body: { query: { match: { "user.username": username } } }
    }))['hits']['hits'];

    if(questions.length == 0) {
        return [];
    } else {
        let qids = [];

        for(var question of questions) {
            qids.push(question._id);
        }

        return qids;
    }
}

/* get all answer ids for specified user */
async function getUserAnswers(username) {
    const answers = (await client.search({
        index: INDEX_ANSWERS,
        size: 1000,
        body: { query: { match: { "user": username } } }
    }))['hits']['hits'];

    if(answers.length == 0) {
        return [];
    } else {
        let aids = []; // lmao

        for(var answer of answers) {
            aids.push(answer._id);
        }

        return aids;
    }
}

module.exports = {
    getUser: getUser,
    getUserQuestions: getUserQuestions,
    getUserAnswers: getUserAnswers
}

