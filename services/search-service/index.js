/* library imports */
const express = require('express');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
/* offer async/await support for ExpressJS */
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8005;

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
});

app.post('/search', async(req, res) => {
    const endpoint = constants.ENDPOINTS.SEARCH;
    const dbRes = await processRequest(req, endpoint);

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
        case constants.ENDPOINTS.SEARCH:
            response = await search(req);
            break;
        default:
            break;
    }

    return response;
}

/* ------------------ ENDPOINTS ------------------ */

/* handle searching */
async function search(req){
    const timestamp = req.body['timestamp'] ? req.body['timestamp'] : constants.currentTime();
    const limit = Math.min(constants.DEFAULT_MAX_LIMIT, req.body['limit'] ? req.body['limit'] : constants.DEFAULT_LIMIT);
    const q = req.body['q'] ? req.body['q'] : constants.DEFAULT_Q
    const sort_by = req.body['sort_by'] ? req.body['sort_by'] : constants.DEFAULT_SORT_BY
    const tags = req.body['tags'] ? req.body['tags'] : constants.DEFAULT_TAGS
    const has_media = req.body['has_media'] ? req.body['has_media'] : constants.DEFAULT_HAS_MEDIA
    const accepted = req.body['accepted'] ? req.body['accepted'] : constants.DEFAULT_ACCEPTED;

    let status = constants.STATUS_200;
    let response = {};

    if (sort_by !== "timestamp" && sort_by !== "score") {
        status = constants.STATUS_400;
        response = { "status":"error", "message": constants.ERR_INVALID_SORT };
        return {status: status, response: response};
    }

    const searchResults = await database.searchQuestions(timestamp, limit, q, sort_by, tags, has_media, accepted);

    status = constants.STATUS_200;
    response = { "status": "OK", "questions": searchResults };
    // console.log(response);
    // console.log("length: " + response['questions'].length);
    return {status: status, response: response};
}

/* Start the server. */
var server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));