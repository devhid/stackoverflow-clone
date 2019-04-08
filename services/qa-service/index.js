/* library imports */
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

/* internal imports */
const database = require('./database');
const constants = require('./constants');
const DBResult = require('./dbresult').DBResult;
const APIResponse = require('./apiresponse').APIResponse;

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8004;

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

/* enable CORS */
app.use(function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

/* milestone 1 */
app.post('/questions/add', async(req, res) => {
    let response = new APIResponse();
    let data = {};

    // grab parameters
    let title = req.body.title;
    let body = req.body.body;
    let tags = req.body.tags;
    let media = req.body.media;
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;

    // check if any mandatory parameters are undefined
    if (user == undefined || title == undefined || body == undefined || tags == undefined){
        console.log("missing params");
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let qid = await database.addQuestion(user, title, body, tags, media);
    
    // check response result
    if (qid === constants.DB_RES_ERROR){
        response.setERR(constants.ERR_GENERAL);
    }
    else if (qid === constants.DB_RES_SUCCESS){
        response.setOK();
        data[constants.ID_KEY] = qid;
    }
    let merged = {...response.toOBJ(), ...data};
    return res.json(merged);
});

app.get('/questions/:qid', async(req, res) => {
    let response = new APIResponse();
    let data = {};

    // grab parameters
    let qid = req.params.qid;
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;

    // on getting the IP
    // https://stackoverflow.com/questions/10849687/express-js-how-to-get-remote-client-address
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // check if any mandatory parameters are undefined
    if (qid == undefined){
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let question = await database.getQuestion(qid, username, ip, true);
    
    // check response result
    if (question === constants.DB_RES_Q_NOTFOUND){
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else {
        response.setOK();
        question._source['id'] = question._id;
        question._source['media'] = (question._source['media'].length == 0) ? null : question._source['media'];
        data[constants.QUESTION_KEY] = question._source;
    }
    let merged = {...response.toOBJ(), ...data};
    return res.json(merged);
});

app.post('/questions/:qid/answers/add', async(req, res) => {
    let response = new APIResponse();
    let data = {};

    // grab parameters
    let qid = req.params.qid;
    let body = req.body.body;
    let media = req.body.media;
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;

    // check if any mandatory parameters are undefined
    if (qid == undefined || body == undefined || user == undefined){
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let answer_id = await database.addAnswer(qid, username, body, media);
    
    // check response result
    if (answer_id === undefined){
        response.setERR(constants.ERR_GENERAL);
    }
    else {
        response.setOK();
        data[constants.ID_KEY] = answer_id;
    }
    let merged = {...response.toOBJ(), ...data};
    return res.json(merged);
});

app.get('/questions/:qid/answers', async(req, res) => {
    let response = new APIResponse();
    let data = {};

    // grab parameters
    let qid = req.params.qid;

    // check if any mandatory parameters are undefined
    if (qid == undefined){
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let answers = await database.getAnswers(qid);
    
    // check response result
    if (answers === undefined){
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else {
        response.setOK();
        data[constants.ANSWERS_KEY] = answers;
    }
    let merged = {...response.toOBJ(), ...data};
    return res.json(merged);
});

/* milestone 2 */
app.delete('/questions/:qid', async(req, res) => {
    // grab parameters
    let response = new APIResponse();

    // grab parameters
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;
    let qid = req.params.qid;
    
    // check if any mandatory parameters are undefined
    if (user == undefined || qid == undefined){
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let deleteRes = await database.deleteQuestion(qid,username);
    
    // check response result
    if (deleteRes === false){           // indicates the question didn't belong to the user
        res.status(403);
        response.setERR(constants.ERR_DEL_NOTOWN_Q);
    }
    else if (deleteRes === undefined){  // indicates the question could not be found
        res.status(404);
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else (deleteRes.status === constants.DB_RES_SUCCESS){
        res.status(200);
        response.setOK();
    }
    return res.json(response.toOBJ());
});

/* milestone 3 */
app.post('/questions/:qid/upvote', async(req, res) => {
    let response = new APIResponse();

    // grab parameters
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;
    let qid = req.params.qid;
    let upvote = req.body.upvote;

    // check if any mandatory parameters are unspecified
    if (username == undefined || qid == undefined || upvote == undefined){
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let updateRes = await database.upvoteQuestion(qid, username, upvote);
    
    // check response result
    if (updateRes.status === constants.DB_RES_Q_NOTFOUND){
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (updateRes.status === constants.DB_RES_ERROR){
        response.setERR(constants.ERR_GENERAL);
    }
    else {
        response.setOK();
    }

    // return HTTP response
    return res.json(response.toOBJ());
});

app.post('/answers/:aid/upvote', async(req, res) => {
    let response = new APIResponse();
    
    // grab parameters
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;
    let aid = req.params.qid;
    let upvote = req.body.upvote;

    // check if any mandatory parameters are unspecified
    if (username == undefined || aid == undefined || upvote == undefined){
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let updateRes = await database.upvoteAnswer(aid, username, upvote);

    // check response result
    if (updateRes.status === constants.DB_RES_A_NOTFOUND){
        response.setERR(constants.ERR_A_NOTFOUND);
    }
    else if (updateRes.status === constants.DB_RES_ERROR){
        response.setERR(constants.ERR_GENERAL);
    }
    else {
        response.setOK();
    }

    // return HTTP response
    return res.json(response.toOBJ());
});

app.post('/answers/:aid/accept', async(req, res) => {
    let response = new APIResponse();
    
    // grab parameters
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;
    let aid = req.params.qid;

    // check if any mandatory parameters are unspecified
    if (username == undefined || aid == undefined){
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let acceptRes = await database.acceptAnswer(aid, username);

    // check response result
    if (acceptRes.status === constants.DB_RES_Q_NOTFOUND){
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (acceptRes.status === constants.DB_RES_A_NOTFOUND){
        response.setERR(constants.ERR_A_NOTFOUND);
    }
    else if (acceptRes.status === constants.DB_RES_NOT_ALLOWED){
        response.setERR(constants.ERR_NOT_ALLOWED);
    }
    else if (acceptRes.status === constants.DB_RES_SUCCESS){
        response.setOK();
    }

    // return HTTP response
    return res.json(response.toOBJ());
});

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
