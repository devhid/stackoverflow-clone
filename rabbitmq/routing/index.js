/* library imports */
const express = require('express');
// const session = require('express-session');
// const RedisStore = require('connect-redis')(session);
const multer = require('multer');

/* internal imports */
const constants = require('./constants');
const rabbit = require('./rabbit');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8008;

/* options for the redis store */
// const redisOptions = {
//     host: '192.168.122.27',
//     port: 6379,
//     pass: 'SWzpgvbqx8GY6Ryvh9HSVAPv6+m6KgqBHesiufT3'
// };

/* options for the session */
// const sessionOptions = {
//     name: 'soc_login',
//     secret: 'EditThisLaterWithARealSecret',
//     unset: 'destroy',
//     resave: false,
//     saveUninitialized: true,
//     logErrors: true,
//     store: new RedisStore(redisOptions)
// };


/* image upload destination */
const upload = multer();

/* handle user sessions */
// app.use(session(sessionOptions));

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

/**
 * Routes an incoming request to a work/rpc queue.
 * Returns an object {'status': RMQ_STATUS, 'data': RMQ_DATA} where RMQ_DATA is data returned from the backend call.
 * If RMQ_STATUS == RMQ_SUCCESS, then 'data' will have the status code to set and the response object to return.
 * @param {string} key routing/binding key for the message
 * @param {Object} data data to send in the message
 */
async function routeRequest(key, data){
    let publishRes = null;
    try {
        publishRes = await rabbit.publishMessage(key, data);
        console.log('hi');
    }
    catch (err){
        publishRes = err;
    }
    return publishRes;
}

/**
 * Wraps a request and routes it to a work/rpc queue.
 * @param {Request} req Express Request object
 * @param {Response} res Express response object
 * @param {string} key routing/binding key for the message (determines which service)
 * @param {string} endpoint which endpoint for the service
 */
async function wrapRequest(req, res, key, endpoint){
    let data = {
        endpoint: endpoint,
        session: {user: ((req.session == undefined) ? undefined : req.session.user)},
        params: req.params,
        body: req.body,
        file: req.file
    };
    let rabbitRes = await routeRequest(key, data);
    console.log(`routeRequest status=${rabbitRes.status}`);
    let dbRes = rabbitRes.data;
    res.status(dbRes.status);
    // mainly for getMedia
    if (dbRes.content_type != undefined){
        res.set('Content-Type', dbRes.content_type);
    }
    return res.json(dbRes.response);
}

/* auth service */
app.post('/login', async(req,res) => {
    let endpoint = constants.ENDPOINTS.AUTH_LOGIN;
    return await wrapRequest(req, res, constants.SERVICES.AUTH, endpoint);
});

app.post('/logout', async(req,res) => {
    let endpoint = constants.ENDPOINTS.AUTH_LOGOUT;
    return await wrapRequest(req, res, constants.SERVICES.AUTH, endpoint);
});

/* email service */
app.post('/verify', async(req,res) => {
    let endpoint = constants.ENDPOINTS.EMAIL_VERIFY;
    return await wrapRequest(req, res, constants.SERVICES.EMAIL, endpoint);
});

/* media service */
app.post('/addmedia', upload.single('content'), async (req,res) => {
    let endpoint = constants.ENDPOINTS.MEDIA_ADD;
    return await wrapRequest(req, res, constants.SERVICES.MEDIA, endpoint);
});

app.get('/media/:id', async(req,res) => {
    let endpoint = constants.ENDPOINTS.MEDIA_GET;
    return await wrapRequest(req, res, constants.SERVICES.MEDIA, endpoint);
});

/* qa service */
app.post('/questions/add', async(req, res) => {
    let data = {
        user: undefined,
        body: req.body
    };
    let rabbitRes = await routeRequest(constants.SERVICES.QA, data);
    let dbRes = rabbitRes.data;
    res.status(dbRes.status);
    return res.json(dbRes.response);
    // let endpoint = constants.ENDPOINTS.QA_ADD_Q;
    // return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.get('/questions/:qid', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_GET_Q;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.post('/questions/:qid/answers/add', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_ADD_A;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.get('/questions/:qid/answers', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_GET_A;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.delete('/questions/:qid', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_DEL_Q;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.post('/questions/:qid/upvote', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_UPVOTE_Q;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.post('/answers/:aid/upvote', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_UPVOTE_A;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.post('/answers/:aid/accept', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_ACCEPT;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

/* registration service */
app.post('/adduser', async (req, res) => {
    let endpoint = constants.ENDPOINTS.REGISTER;
    return await wrapRequest(req, res, constants.SERVICES.REGISTER, endpoint);
});

/* search service */
app.post('/search', async (req, res) => {
    let endpoint = constants.ENDPOINTS.SEARCH;
    return await wrapRequest(req, res, constants.SERVICES.SEARCH, endpoint);
});

/* user service */
app.get('/user/:uid', async (req, res) => {
    let endpoint = constants.ENDPOINTS.USER_GET;
    return await wrapRequest(req, res, constants.SERVICES.USER, endpoint);
});

app.get('/user/:uid/questions', async (req, res) => {
    let endpoint = constants.ENDPOINTS.USER_Q;
    return await wrapRequest(req, res, constants.SERVICES.USER, endpoint);
});

app.get('/user/:uid/answers', async (req, res) => {
    let endpoint = constants.ENDPOINTS.USER_A;
    return await wrapRequest(req, res, constants.SERVICES.USER, endpoint);
});

/* Start the server. */
var server = app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(){
    rabbit.shutdown();
    server.close();
}
