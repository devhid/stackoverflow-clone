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
const PORT = 3002;

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

/* milestone 1 */
app.post('/questions/add', async(req, res) => {
    let response = generateERR();

    // grab parameters
    let title = req.body.title;
    let body = req.body.body;
    let tags = req.body.tags;
    let media = req.body.media;
    let user = req.session.user;

    // check if any mandatory parameters are undefined
    if (user == undefined || title == undefined || body == undefined || tags == undefined){
        console.log("missing params");
        console.log(user);
        console.log(title);
        console.log(body);
        console.log(tags);
        response[constants.STATUS_ERR] = constants.ERR_MISSING_PARAMS;
        return res.json(response);
    }

    // perform database operations
    let qid = await database.addQuestion(user, title, body, tags, media);
    console.log(qid);
    if (!qid){
        response[constants.STATUS_ERR] = constants.ERR_GENERAL;
        return res.json(response);
    }
    response = generateOK();
    response[constants.ID_KEY] = qid;
    return res.json(response);
});

app.get('/questions/:qid', async(req, res) => {
    let response = generateERR();

    // grab parameters
    let qid = req.params.qid;
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;

    // on getting the IP
    // https://stackoverflow.com/questions/10849687/express-js-how-to-get-remote-client-address
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // check if any mandatory parameters are undefined
    if (qid == undefined){
        response[constants.STATUS_ERR] = constants.ERR_MISSING_PARAMS;
        return res.json(response);
    }

    // perform database operations

    let question = await database.getQuestion(qid, username, ip, true);
    if (!question){
        response[constants.STATUS_ERR] = constants.ERR_Q_NOTFOUND;
        return res.json(response);
    }

    question._source['id'] = question._id;
    question._source['media'] = (question._source['media'].length == 0) ? null : question._source['media'];
    response = generateOK();
    response[constants.QUESTION_KEY] = question._source;
    return res.json(response);
});

app.post('/questions/:qid/answers/add', async(req, res) => {
    let response = generateERR();

    // grab parameters
    let qid = req.params.qid;
    let body = req.body.body;
    let media = req.body.media;
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;

    // check if any mandatory parameters are undefined
    if (qid == undefined || body == undefined || user == undefined){
        response[constants.STATUS_ERR] = constants.ERR_MISSING_PARAMS;
        return res.json(response);
    }

    // perform database operations
    let answer = await database.addAnswer(qid, username, body, media);
    if (answer == undefined){
        response[constants.STATUS_ERR] = constants.ERR_GENERAL;
        return res.json(response);
    }

    response = generateOK();
    response[constants.ID_KEY] = answer._id;
    return res.json(response);
});

app.get('/questions/:qid/answers', async(req, res) => {
    let response = generateERR();

    // grab parameters
    let qid = req.params.qid;

    // check if any mandatory parameters are undefined
    if (qid == undefined){
        response[constants.STATUS_ERR] = constants.ERR_MISSING_PARAMS;
        return res.json(response);
    }

    // perform database operations
    let answers = await database.getAnswers(qid);
    if (answers == undefined){
        response[constants.STATUS_ERR] = constants.ERR_Q_NOTFOUND;
        return res.json(response);
    }

    response = generateOK();
    response[constants.ANSWERS_KEY] = answers;
    return res.json(response);
});

/* milestone 2 */
app.delete('/questions/:qid', async(req, res) => {
    // grab parameters
    let response = generateERR();
    let user = req.session.user;
    let qid = req.params.qid;
    
    // check if any mandatory parameters are undefined
    if (user == undefined || qid == undefined)
        return res.json(response);

    // perform database operations
    let status = await database.deleteQuestion(qid,user);
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

/* milestone 3 */
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
