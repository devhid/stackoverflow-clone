/* library imports */
const express = require('express');
const request = require('request');

/* internal imports */
const servers = require('./servers');

/* initialize express application */
const app = express();

/* port to run server on */
const PORT = 5000;

/* parse incoming requests data as json */
app.use(express.json());

/* all routes for stack overflow api */

app.get('/', (req, res) => {
   return res.send('<html><h1>kellogs</h1></html>');
});

app.post('/adduser', (req, res) => {
    request.post(servers.REGISTRATION + '/adduser', { "json": req.body}, (error, response, body) => {
        return res.json(body);
    });
});

app.post('/login', (req, res) => {
    request.post(servers.AUTHENTICATION + '/login', { "json":req.body }, (error, response, body) => {
        return res.json(body);
    });
});

app.post('/logout', (req, res) => {
    request.post(servers.AUTHENTICATION + '/logout', { "json":req.body }, (error, response, body) => {
        return res.json(body);
    });
});

app.post('/verify', (req, res) => {
    request.post(servers.EMAIL_VERIFICATION + '/verify', { "json":req.body }, (error, response, body) => {
        return res.json(body);
    });
});

app.post('/questions/add', (req, res) => {
    request.post(servers.QA, '/questions/add', { "json":req.body }, (error, response, body) => {
        return res.json(body);
    });
});

app.get('/questions/:qid', (req, res) => {
    request.get(servers.QA + '/questions/' + req.params.qid, (error, response, body) => {
        return res.json(body);
    });
});

app.post('/questions/:qid/answers/add', (req, res) => {
    request.post(servers.QA + '/questions/' + req.params.qid + '/answers/add', { "json":req.body }, (error, response, body) => {
        return res.json(body);
    });
});

app.get('/questions/:qid/answers', (req, res) => {
    request.get(servers.QA + '/questions/' + req.params.qid + '/answers', (error, response, body) => {
        return res.json(body);
    });
});

app.post('/search', (req, res) => {
    request.post(servers.SEARCH + '/search', { "json": req.body }, (error, response, body) => {
        return res.json(body);
    });
});

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
