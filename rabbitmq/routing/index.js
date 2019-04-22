/* library imports */
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
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

/* image upload destination */
const upload = multer();

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

/**
 * Routes an incoming request to a work/rpc queue.
 * Returns an object {'status': RMQ_STATUS, 'data': RMQ_DATA} where RMQ_DATA is data returned from the backend call.
 * @param {string} key routing/binding key for the message
 * @param {Object} data data to send in the message
 */
async function routeRequest(key, data){
    let publishRes = null;
    try {
        publishRes = await rabbit.publishMessage(key, data);
    }
    catch (err){
        publishRes = err;
    }
    return publishRes;
}

/**
 * Wraps a request and routes it to a work/rpc queue.
 * @param {Response} res Express response object
 * @param {string} key routing/binding key for the message
 * @param {Object} data data to send in the message
 */
async function wrapRequest(res, key, data){
    let rabbitRes = await routeRequest(key, data);
    let dbRes = rabbitRes.data;
    res.status(dbRes.status);
    return res.json(dbRes.response);
}


/* auth service */
app.post('/login', async(req,res) => {
    let data = {
        user: req.session.user,
        body: req.body
    };
    return await wrapRequest(res, constants.KEYS.AUTH, data);
});

app.post('/logout', async(req,res) => {
    let data = {
        user: req.session.user
    };
    return await wrapRequest(res, constants.KEYS.AUTH, data);
});

/* email service */
app.post('/verify', async(req,res) => {
    let data = {
        body: req.body
    };
    return await wrapRequest(res, constants.KEYS.EMAIL, data);
});

/* media service */

app.post('/addmedia', upload.single('content'), async (req,res) => {
    let data = {
        user: req.session.user,
        file: req.file
    };
    return await wrapRequest(res, constants.KEYS.MEDIA, data);
});

app.get('/media/:id', async(req,res) => {

});

/* qa service */

app.post('/questions/add', async(req, res) => {
    let data = {
        user: req.session.user,
        body: req.body
    };
    let rabbitRes = await routeRequest(constants.KEYS.QA, data);
    let dbRes = rabbitRes.data;
    res.status(dbRes.status);
    return res.json(dbRes.response);
});

app.get('/questions/:qid', async(req, res) => {

});

app.post('/questions/:qid/answers/add', async(req, res) => {

});

app.get('/questions/:qid/answers', async(req, res) => {

});

app.delete('/questions/:qid', async(req, res) => {

});

app.post('/questions/:qid/upvote', async(req, res) => {

});

app.post('/answers/:aid/upvote', async(req, res) => {

});

app.post('/answers/:aid/accept', async(req, res) => {

});

/* registration service */
app.post('/adduser', async (req, res) => {

});

/* search service */
app.post('/search', async (req, res) => {

});

/* user service */
app.get('/user/:uid', async (req, res) => {

});

app.get('/user/:uid/questions', async (req, res) => {

});

app.get('/user/:uid/answers', async (req, res) => {

});

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
