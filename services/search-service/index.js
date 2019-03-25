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
const PORT = 4000;

/* parse incoming requests data as json */
app.use(express.json());

/* handle searching */
app.post('/search', async (req, res) => {
    const timestamp = req.body['timestamp'] ? req.body['timestamp'] : constants.DEFAULT_TIMESTAMP;
    const limit = Math.min(constants.DEFAULT_MAX_LIMIT, req.body['limit'] ? req.body['limit'] : constants.DEFAULT_LIMIT);
    const accepted = req.body['accepted'] ? req.body['accepted'] : constants.DEFAULT_ACCEPTED;

    const searchResults = await database.searchQuestions(timestamp, limit, accepted);

    let response = {"status": "OK", "questions": searchResults};
    return res.json(response);

});

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
