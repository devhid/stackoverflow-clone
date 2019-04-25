/* library imports */
const express = require('express');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8006;

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

/* user service */
app.get('/user/:uid', async (req, res) => {
    let endpoint = constants.ENDPOINTS.USER_GET;
    let dbRes = await processRequest(req, endpoint);
    res.status(dbRes.status);
    return res.json(dbRes.response);
});

app.get('/user/:uid/questions', async (req, res) => {
    let endpoint = constants.ENDPOINTS.USER_Q;
    let dbRes = await processRequest(req, endpoint);
    res.status(dbRes.status);
    return res.json(dbRes.response);
});

app.get('/user/:uid/answers', async (req, res) => {
    let endpoint = constants.ENDPOINTS.USER_A;
    let dbRes = await processRequest(req, endpoint);
    res.status(dbRes.status);
    return res.json(dbRes.response);
});

/**
 * Processes the request contained in the message and replies to the specified queue.
 * @param {Object} msg the message on the RabbitMQ queue
 */
async function processRequest(req, endpoint){
    let response = {};
    switch (endpoint) {
        case constants.ENDPOINTS.USER_GET:
            response = await getUser(req);
            break;
        case constants.ENDPOINTS.USER_Q:
            response = await getUserQuestions(req);
            break;
        case constants.ENDPOINTS.USER_A:
            response = await getUserAnswers(req);
            break;
        default:
            break;
    }
    return response;
}

/* ------------------ ENDPOINTS ------------------ */

/* get information about user */
async function getUser(req){
    let status = constants.STATUS_400;
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return {status: status, response: response};
    }

    const user = await database.getUser(username);
    if(user === null) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return {status: status, response: response};
    }

    response = generateOK();
    response[constants.USER_KEY] = user;

    status = constants.STATUS_200;
    return {status: status, response: response};
}

/* get user's questions */
async function getUserQuestions(req){
    let status = constants.STATUS_400;
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return {status: status, response: response};
    }

    const user = await database.getUser(username);
    if(user === null) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return {status: status, response: response};
    }

    const qids = await database.getUserQuestions(username);
    response = generateOK();
    response[constants.QUESTIONS_KEY] = qids;
    console.log(response);

    status = constants.STATUS_200;
    return {status: status, response: response};
}

/* get user's answers */
async function getUserAnswers(req){
    let status = constants.STATUS_400;
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return {status: status, response: response};
    }

    const user = await database.getUser(username);
    if(user === null) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return {status: status, response: response};
    }

    const aids = await database.getUserAnswers(username);

    response = generateOK();
    response[constants.ANSWERS_KEY] = aids;

    status = constants.STATUS_200;
    return {status: status, response: response};
}

/* helper funcs */
function generateOK(){
    let response = {};
    response[constants.STATUS_KEY] = constants.STATUS_OK;
    return response;
}

function generateERR(){
    let response = {};
    response[constants.STATUS_KEY] = constants.STATUS_ERR;
    response[constants.STATUS_ERR] = '';
    return response;
}

/* Start the server. */
var server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(){
    server.close();
}
