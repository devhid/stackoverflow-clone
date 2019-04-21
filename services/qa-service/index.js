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
  res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Credentials', 'true');
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
        if (user == undefined){
            res.status(constants.STATUS_401);
        }
        else {
            res.status(constants.STATUS_400);
        }   
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let addRes = await database.addQuestion(user, title, body, tags, media);
    
    // check response result
    if (addRes.status === constants.DB_RES_ERROR){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_GENERAL);
    }
    else if (addRes.status === constants.DB_RES_SUCCESS){
        res.status(constants.STATUS_200);
        response.setOK();
        data[constants.ID_KEY] = addRes.data;
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
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let getRes = await database.getQuestion(qid, username, ip, true);
    
    // check response result
    if (getRes.status === constants.DB_RES_Q_NOTFOUND){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (getRes.status === constants.DB_RES_SUCCESS){
        res.status(constants.STATUS_200);
        response.setOK();
        let question = getRes.data;
        let actual_rep = question._source.user.actual_reputation;
        question._source.user.reputation = (actual_rep < 1) ? 1 : actual_rep;
        delete question._source.user.actual_reputation;
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
        if (user == undefined){
            res.status(constants.STATUS_401);
        }
        else {
            res.status(constants.STATUS_400);
        }
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let addRes = await database.addAnswer(qid, username, body, media);
    
    // check response result
    if (addRes.status === constants.DB_RES_Q_NOTFOUND){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (addRes.status === constants.DB_RES_ERROR){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_GENERAL);
    }
    else if (addRes.status === constants.DB_RES_SUCCESS){
        res.status(constants.STATUS_200);
        response.setOK();
        data[constants.ID_KEY] = addRes.data;
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
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let getRes = await database.getAnswers(qid);
    
    // check response result
    if (getRes.status === constants.DB_RES_Q_NOTFOUND){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (getRes.status === constants.DB_RES_SUCCESS){
        res.status(constants.STATUS_200);
        response.setOK();
        data[constants.ANSWERS_KEY] = getRes.data;
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
        if (user == undefined){
            res.status(constants.STATUS_401);
        }
        else {
            res.status(constants.STATUS_400);
        }
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let deleteRes = await database.deleteQuestion(qid,username);
    
    // check response result
    if (deleteRes.status === constants.DB_RES_NOT_ALLOWED){
        res.status(constants.STATUS_403);
        response.setERR(constants.ERR_DEL_NOTOWN_Q);
    }
    else if (deleteRes.status === constants.DB_RES_Q_NOTFOUND){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (deleteRes.status === constants.DB_RES_SUCCESS){
        res.status(constants.STATUS_200);
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
    let upvote = (req.body.upvote == undefined) ? true : req.body.upvote;

    // check if any mandatory parameters are unspecified
    if (user == undefined || qid == undefined || upvote == undefined){
        if (user == undefined){
            res.status(constants.STATUS_401);
        }
        else {
            res.status(constants.STATUS_400);
        }
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let updateRes = await database.upvoteQuestion(qid, username, upvote);
    
    // check response result
    if (updateRes.status === constants.DB_RES_Q_NOTFOUND){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (updateRes.status === constants.DB_RES_ERROR){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_GENERAL);
    }
    else if (updateRes.status === constants.DB_RES_SUCCESS){
        res.status(constants.STATUS_200);
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
    let aid = req.params.aid;
    let upvote = (req.body.upvote == undefined) ? true : req.body.upvote;

    // check if any mandatory parameters are unspecified
    if (user == undefined || aid == undefined || upvote == undefined){
        if (user == undefined){
            res.status(constants.STATUS_401);
        }
        else {
            res.status(constants.STATUS_400);
        }
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let updateRes = await database.upvoteAnswer(aid, username, upvote);

    // check response result
    if (updateRes.status === constants.DB_RES_A_NOTFOUND){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_A_NOTFOUND);
    }
    else if (updateRes.status === constants.DB_RES_ERROR){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_GENERAL);
    }
    else {
        res.status(constants.STATUS_200);
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
    let aid = req.params.aid;

    // check if any mandatory parameters are unspecified
    if (user == undefined || aid == undefined){
        if (user == undefined){
            res.status(constants.STATUS_401);
        }
        else {
            res.status(constants.STATUS_400);
        }
        response.setERR(constants.ERR_MISSING_PARAMS);
        return res.json(response.toOBJ());
    }

    // perform database operations
    let acceptRes = await database.acceptAnswer(aid, username);

    // check response result
    if (acceptRes.status === constants.DB_RES_Q_NOTFOUND){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (acceptRes.status === constants.DB_RES_A_NOTFOUND){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_A_NOTFOUND);
    }
    else if (acceptRes.status === constants.DB_RES_NOT_ALLOWED){
        res.status(constants.STATUS_403);
        response.setERR(constants.ERR_NOT_ALLOWED);
    }
    else if (acceptRes.status === constants.DB_RES_ALRDY_ACCEPTED){
        res.status(constants.STATUS_400);
        response.setERR(constants.ERR_ALRDY_ACCEPTED);
    }
    else if (acceptRes.status === constants.DB_RES_SUCCESS){
        res.status(constants.STATUS_200);
        response.setOK();
    }

    // return HTTP response
    return res.json(response.toOBJ());
});

app.get('/questions/:username/questions', async(req, res) => {
    let username = req.params.username;

    let result = await database.getQuestionsByUser(username);
    console.log(result);
    console.log(`${result.length} results`);
    let response = {'questions': result};
    return res.json(response);
});

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
