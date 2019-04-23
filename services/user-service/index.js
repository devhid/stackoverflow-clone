/* library imports */
const express = require('express');
const amqp = require('amqplib/callback_api');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8006;

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

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
                ch.assertQueue(constants.SERVICES.USER, constants.QUEUE.PROPERTIES, function(error3, q){
                    if (error3){
                        throw error3;
                    }
                    console.log(`[Rabbit] Asserted queue... ${q.queue}`);
                    ch.bindQueue(q.queue, ex.exchange, constants.SERVICES.USER);
                    console.log(`[Rabbit] Binded ${q.queue} with key ${constants.SERVICES.USER} to ${ex.exchange}...`);
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
        case constants.ENDPOINTS.USER_GET:
            response = await getUser(req);
            break;
        case constants.ENDPOINTS.USER_Q:
            response = await getUserQuestions(req);
            break;
        case constants.ENDPOINTS.USER_A:
            response = await getUserAnswers(req);
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

/* get information about user */
async function getUser(req){
    let status = constants.STATUS_400;
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return {status: status, response: response};
    }

    const user = await database.getUser(username);
    if(user === null) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return {status: status, response: response};
    }

    response = generateOK();
    response[constants.USER_KEY] = user;

    status = constants.STATUS_200;
    return {status: status, response: response};
}

/* get user's questions */
async function getUserQuestions(req){
    let status = constants.STATUS_400;
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return {status: status, response: response};
    }

    const user = await database.getUser(username);
    if(user === null) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return {status: status, response: response};
    }

    const qids = await database.getUserQuestions(username);
    response = generateOK();
    response[constants.QUESTIONS_KEY] = qids;
    console.log(response);

    status = constants.STATUS_200;
    return {status: status, response: response};
}

/* get user's answers */
async function getUserAnswers(req){
    let status = constants.STATUS_400;
    let response = generateERR();

    const username = req.params['uid'];
    if(username === undefined) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
        return {status: status, response: response};
    }

    const user = await database.getUser(username);
    if(user === null) {
        status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
        return {status: status, response: response};
    }

    const aids = await database.getUserAnswers(username);

    response = generateOK();
    response[constants.ANSWERS_KEY] = aids;

    status = constants.STATUS_200;
    return {status: status, response: response};
}

/* helper funcs */
function generateOK(){
    let response = {};
    response[constants.STATUS_KEY] = constants.STATUS_OK;
    return response;
}

function generateERR(){
    let response = {};
    response[constants.STATUS_KEY] = constants.STATUS_ERR;
    response[constants.STATUS_ERR] = '';
    return response;
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
