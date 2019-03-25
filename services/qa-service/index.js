/* library imports */
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 5000;

/* options for the redis store */
const redisOptions = {
    host: '64.52.162.153',
    port: 6379,
    pass: 'SWzpgvbqx8GY6Ryvh9HSVAPv6+m6KgqBHesiufT3'
};

/* options for the session */
const sessionOptions = {
    name: 'soc_login',
    secret: 'EditThisLaterWithARealSecret',
    unset: 'destroy',
    resave: false,
    saveUninitialized: true,
    logErrors: true,
    store: new RedisStore(redisOptions)
};

/* handle user sessions */
app.use(session(sessionOptions));

/* parse incoming requests data as json */
app.use(express.json());

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

/* route handling */
app.post('/questions/add', async(req, res) => {
    // grab parameters
    let response = generateERR();
    let title = req.body.title;
    let body = req.body.body;
    let tags = req.body.tags;
    let media = req.body.media;
    let user = req.session.user;

    // check if any mandatory parameters are undefined
    if (user == undefined || title == undefined || body == undefined || tags == undefined)
        return res.json(response);

    // perform database operations
    let qid = await database.addQuestion(user, title, body, tags, media);
    response = generateOK();
    response[constants.ID_KEY] = qid;
    return res.json(response);
});

app.get('/questions/:qid', async(req, res) => {
    // grab parameters
    let response = generateERR();
    let qid = req.params.qid;

    // check if any mandatory parameters are undefined
    if (qid == undefined)
        return res.json(response);

    // perform database operations
    let question = await database.getQuestion(qid);
    question._source['id'] = question._id;
    response = generateOK();
    response[constants.QUESTION_KEY] = question._source;
    return res.json(response);
});

app.delete('/questions/:qid', async(req, res) => {
    // grab parameters
    let response = generateERR();
    let user = req.session.user;
    let qid = req.params.qid;
    
    // check if any mandatory parameters are undefined
    if (user == undefined || qid == undefined)
        return res.json(response);

    // perform database operations
    let status = await database.deleteQuestion(user,qid);
    if (status === false){
        res.status(403);
        response[constants.STATUS_ERR] = constants.ERR_DEL_NOTOWN_Q;
    }
    else if (status === null){
        res.status(404);
        response[constants.STATUS_ERR] = constants.ERR_GENERAL;
    }
    else {
        res.status(200);
        response = generateOK();
    }
    return res.json(response);
});

app.post('/questions/:qid/answers/add', async(req, res) => {
    let response = generateERR();
    return res.json(response);
});

app.get('/questions/:qid/answers', async(req, res) => {
    let response = generateERR();
    return res.json(response);
});

app.post('/questions/:qid/upvote', async(req, res) => {
    let response = generateERR();
    return res.json(response);
});

app.post('/answers/:aid/upvote', async(req, res) => {
    let response = generateERR();
    return res.json(response);
});

app.post('/answers/:aid/accept', async(req, res) => {
    let response = generateERR();
    return res.json(response);
});

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));