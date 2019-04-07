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

/* the port the server will listen on */
const PORT = 4006;

/* get information about user */
app.get('/user/:uid', async (req, res) => {
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return res.json(response);
    }

    const user = await database.getUser(username);
    if(user === null) {
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return res.json(response);
    }

    response = generateOK();
    response[constants.USER_KEY] = user;

    return res.json(response);
});

/* get user's questions */
app.get('/user/:uid/questions', async (req, res) => {
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return res.json(response);
    }

    const user = await database.getUser(username);
    if(user === null) {
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return res.json(response);
    }

    const qids = await database.getUserQuestions(username);

    response = generateOK();
    response[constants.QUESTIONS_KEY] = qids;

    return res.json(response);
});

/* get user's answers */
app.get('/user/:uid/answers', async (req, res) => {
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return res.json(response);
    }

    const user = await database.getUser(username);
    if(user === null) {
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return res.json(response);
    }

    const aids = await database.getUserAnswers(username);

    response = generateOK();
    response[constants.ANSWERS_KEY] = aids;

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
