/* library imports */
const express = require('express');
const amqp = require('amqplib/callback_api');

/* internal imports */
const constants = require('./constants');
const rabbit = require('./rabbit');
const APIResponse = require('./apiresponse').APIResponse;

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8008;

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

/* auth service */
app.post('/login', async(req,res) => {

});

app.get('/increment', async(req,res) => {

});

app.post('/logout', async(req,res) => {

});

/* email service */
app.post('/verify', async(req,res) => {

});

/* media service */
app.post('/addmedia', async(req,res) => {

});

app.get('/media/:id', async(req,res) => {

});

/* qa service */

app.post('/questions/add', async(req, res) => {
    let response = new APIResponse();

    let publishRes = null;
    try {
        publishRes = await rabbit.publishMessage(constants.KEYS.QA, req.body);
    }
    catch (err){
        publishRes = err;
    }

    if (publishRes.status === constants.DB_RES_SUCCESS){
        console.log(`Success`);
    }
    else { 
        console.log(`Failure, ${publishRes.status}`);
    }
    console.log(`Data ${publishRes.data}`);
    return res.json(response.toOBJ());
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
