/* library imports */
const express = require('express');
const amqp = require('amqplib/callback_api');

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
/*app.use(function(req, res, next) {
    res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
});*/

/* amqplib connection */
var conn = null;
var ch = null;

/**
 * Asserts the Exchange and Queue exists and sets up the connection variables.
 */
function setupConnection(){
    console.log(`[Rabbit] Setting up connection...`);
    amqp.connect(constants.AMQP, function(error0, connection) {
        if (error0) {
            throw error0;
        }
        console.log(`[Rabbit] Connected...`);
        conn = connection;
        connection.createChannel(function(error1, channel) {
            if (error1) {
                throw error1;
            }
            console.log(`[Rabbit] Channel created...`);
            ch = channel;
            channel.assertExchange(constants.EXCHANGE.NAME, constants.EXCHANGE.TYPE, constants.EXCHANGE.PROPERTIES, (error2, ex) => {
                if (error2){
                    throw error2;
                }
                console.log(`[Rabbit] Asserted exchange... ${ex.exchange}`);
                ch.assertQueue(constants.SERVICES.SEARCH, constants.QUEUE.PROPERTIES, function(error3, q){
                    if (error3){
                        throw error3;
                    }
                    console.log(`[Rabbit] Asserted queue... ${q.queue}`);
                    ch.bindQueue(q.queue, ex.exchange, constants.SERVICES.SEARCH);
                    console.log(`[Rabbit] Binded ${q.queue} with key ${constants.SERVICES.SEARCH} to ${ex.exchange}...`);
                    ch.prefetch(1); 
                    console.log(`[Rabbit] Set prefetch 1...`);
                    ch.consume(q.queue, processRequest);
                    console.log(`[Rabbit] Attached processRequest callback to ${q.queue}...`);
                });
            });
        });
    });
}

/**
 * Processes the request contained in the message and replies to the specified queue.
 * @param {Object} msg the message on the RabbitMQ queue
 */
async function processRequest(msg){
    let req = JSON.parse(msg.content.toString()); // gives back the data object
    let endpoint = req.endpoint;
    let response = {};
    switch (endpoint) {
        case constants.ENDPOINTS.SEARCH:
            response = await search(req);
            break;
        default:
            break;
    }
    ch.sendToQueue(msg.properties.replyTo,
        Buffer.from(JSON.stringify(response)), {
            correlationId: msg.properties.correlationId
        }
    );
    ch.ack(msg);
}

function main(){
    try {
        setupConnection();
    } catch (err){
        console.log(`[Rabbit] Failed to connect ${err}`);
    }
}

main();

/* ------------------ ENDPOINTS ------------------ */

/* handle searching */
async function search(req){
    console.log(req);
    const timestamp = req.body['timestamp'] ? req.body['timestamp'] : constants.currentTime();
    const limit = Math.min(constants.DEFAULT_MAX_LIMIT, req.body['limit'] ? req.body['limit'] : constants.DEFAULT_LIMIT);
    const q = req.body['q'] ? req.body['q'] : constants.DEFAULT_Q
    const sort_by = req.body['sort_by'] ? req.body['sort_by'] : constants.DEFAULT_SORT_BY
    console.log(sort_by);
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

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(){
    if (ch) ch.close();
    if (conn) conn.close();
    server.close();
}
