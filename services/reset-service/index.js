/* library imports */
const express = require('express');
const request = require('request');

/* internal imports */

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8000;

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
    res.set('Access-Control-Allow-Origin', 'http://130.245.171.47');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Credentials', 'true');
    next();
});

/* Start the server. */
var server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(){
    server.close();
}

/* rest service */
app.post('/reset', async(req, res) => {
    let endpoint = 'reset'
    let dbRes = await processRequest(req, endpoint);
    res.status(dbRes.status);
    return res.json(dbRes.response);
});

/**
 * Processes the request contained in the message and replies to the specified queue.
 * @param {Object} msg the message on the RabbitMQ queue
 */
async function processRequest(req, endpoint){
    let response = {};
    switch (endpoint) {
        case 'reset':
            response = await resetDB(req);
            break;
        default:
            break;
    }
    return response;
}

/* ------------------ ENDPOINTS ------------------ */
const indices = ["users", "questions", "answers", "views", "q-upvotes", "a-upvotes", "media"];

async function resetDB(req){
    for (var index of indices){
        console.log(`clearing ${index}`);
        request.post(`http://admin:ferdman123@130.245.169.86:92/${index}/_delete_by_query`, { json: { "query": { "match_all": {} } } });
    }
    return {status: 200, response: {status: 'OK'}};
}
