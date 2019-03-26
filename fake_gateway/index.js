/* library imports */
const express = require('express');
const request = require('request');

/* internal imports */
const servers = require('./servers');

/* initialize express application */
const app = express();

/* port to run server on */
const PORT = 8000;

/* all routes for stack overflow api */

app.get('/', (req, res) => {
   return res.send('<html><h1>kellogs</h1></html>');
});

app.post('/adduser', (req, res) => {
    request.post(servers.REGISTRATION + '/adduser', { "form":req.body }, (error, response, body) => {
        return res.json(JSON.parse(body));
    });
});

app.post('/login', (req, res) => {
    request.post(servers.AUTHENTICATION + '/login', { "form":req.body }, (error, response, body) => {
        return res.json(JSON.parse(body));
    });
});

app.post('/logout', (req, res) => {
    request.post(servers.AUTHENTICATION + '/logout', { "form":req.body }, (error, response, body) => {
        return res.json(JSON.parse(body));
    });
});

app.post('/verify', (req, res) => {
    request.post(servers.EMAIL_VERIFICATION + '/verify', { "form":req.body }, (error, response, body) => {
        return res.json(JSON.parse(body));
    });
});

app.post('/questions/add', (req, res) => {
    request.post(servers.QA, '/questions/add', { "form":req.body }, (error, response, body) => {
        return res.json(JSON.parse(body));
    });
});

app.get('/questions/:qid', (req, res) => {
    request.get(servers.QA + '/questions/' + req.params.qid, (error, response, body) => {
        return res.json(JSON.parse(body));
    });
});

app.post('/questions/:qid/answers/add', (req, res) => {
    request.post(servers.QA + '/questions/' + req.params.qid + '/answers/add', { "form":req.body }, (error, response, body) => {
        return res.json(JSON.parse(body));
    });
});

app.get('/questions/:qid/answers', (req, res) => {
    request.get(servers.QA + '/questions/' + req.params.qid + '/answers', (error, response, body) => {
        return res.json(JSON.parse(body));
    });
});

app.post('/search', (req, res) => {
    request.post(servers.SEARCH + '/search', { "form": req.body }, (error, response, body) => {
        return res.json(JSON.parse(body));
    });
});

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
