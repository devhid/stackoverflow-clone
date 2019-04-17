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

/* handle searching */
app.post('/search', async (req, res) => {
    console.log(req.body);
    const timestamp = req.body['timestamp'] ? req.body['timestamp'] : constants.currentTime();
    const limit = Math.min(constants.DEFAULT_MAX_LIMIT, req.body['limit'] ? req.body['limit'] : constants.DEFAULT_LIMIT);
    const q = req.body['q'] ? req.body['q'] : constants.DEFAULT_Q
    const sort_by = req.body['sort_by'] ? req.body['sort_by'] : constants.DEFAULT_SORT_BY
    const tags = req.body['tags'] ? req.body['tags'] : constants.DEFAULT_TAGS
    const has_media = req.body['has_media'] ? req.body['has_media'] : constants.DEFAULT_HAS_MEDIA
    const accepted = req.body['accepted'] ? req.body['accepted'] : constants.DEFAULT_ACCEPTED;

    let response = {};

    if(sort_by != "timestamp" && sort_by != "score") {
        response = { "status":"error", "message": constants.ERR_INVALID_SORT };
    }

    const searchResults = await database.searchQuestions(timestamp, limit, q, sort_by, tags, has_media, accepted);

    response = { "status": "OK", "questions": searchResults };
//    console.log(response);
    console.log("length: " + response['questions'].length);
    return res.json(response);

});

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
