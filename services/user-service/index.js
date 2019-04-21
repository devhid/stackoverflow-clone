/* library imports */
const express = require('express');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
/* offer async/await support for ExpressJS */
require('express-async-errors');

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

/* the port the server will listen on */
const PORT = 8006;

/* get information about user */
app.get('/user/:uid', async (req, res) => {
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        res.status(constants.STATUS_400);
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return res.json(response);
    }

    const user = await database.getUser(username);
    if(user === null) {
        res.status(constants.STATUS_400);
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return res.json(response);
    }

    response = generateOK();
    response[constants.USER_KEY] = user;

    res.status(constants.STATUS_200);
    return res.json(response);
});

/* get user's questions */
app.get('/user/:uid/questions', async (req, res) => {
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        res.status(constants.STATUS_400);
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return res.json(response);
    }

    const user = await database.getUser(username);
    if(user === null) {
        res.status(constants.STATUS_400);
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return res.json(response);
    }

    const qids = await database.getUserQuestions(username);
    response = generateOK();
    response[constants.QUESTIONS_KEY] = qids;
    console.log(response);

    res.status(constants.STATUS_200);
    return res.json(response);
});

/* get user's answers */
app.get('/user/:uid/answers', async (req, res) => {
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        res.status(constants.STATUS_400);
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return res.json(response);
    }

    const user = await database.getUser(username);
    if(user === null) {
        res.status(constants.STATUS_400);
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return res.json(response);
    }

    const aids = await database.getUserAnswers(username);

    response = generateOK();
    response[constants.ANSWERS_KEY] = aids;

    res.status(constants.STATUS_200);
    return res.json(response);
});

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
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
