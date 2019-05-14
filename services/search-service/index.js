/* library imports */
const express = require('express');
const rabbot = require('rabbot');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
/* offer async/await support for ExpressJS */
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8006;

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
    res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Credentials', 'true');
    next();
});


rabbot.nackOnError();

/* install handlers */
rabbot.handle({
    queue: constants.SERVICES.SEARCH,
    type: constants.ENDPOINTS.SEARCH,
    autoNack: false,
    handler: search
});

/* configure rabbot */
rabbot.configure(constants.RABBOT_SETTINGS)
    .then(function(){
        console.log('[Rabbot] Rabbot configured...');
    }).catch(err => {
        console.log(`[Rabbot] err ${err}`);
    });


/* ------------------ ENDPOINTS ------------------ */

/* handle searching */
async function search(request){
    let req = request.body;
    try {
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
            request.reply({status: status, response: response});
            request.ack();
            return;
        }

        const searchResults = await database.searchQuestions(timestamp, limit, q, sort_by, tags, has_media, accepted);

        status = constants.STATUS_200;
        response = { "status": "OK", "questions": searchResults };
        request.reply({status: status, response: response});
        request.ack();
    } catch (err){
        console.log(`[Search] search err ${JSON.stringify(err)}`);
        request.nack();
    }
}

/* Start the server. */
var server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(){
    rabbot.shutdown(true);
    server.close();
}
