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
try {
    amqp.connect(constants.AMQP_HOST, function(error0, connection) {
        if (error0) {
            throw error0;
        }
        conn = connection;
        connection.createChannel(function(error1, channel) {
            if (error1) {
                throw error1;
            }
            ch = channel;
            channel.assertExchange(constants.EXCHANGE.NAME, constants.EXCHANGE.TYPE, constants.EXCHANGE.PROPERTIES, (err, ok) => {
                if (err){
                    throw err;
                }
                console.log(`ok ${JSON.stringify(ok)}`);
                setTimeout(listen, 1000);
            });
        });
    });
}
catch (err){
    console.log(`[Rabbit] Failed to connect ${err}`);
}

function listen(){
    ch.assertQueue(constants.SERVICES.USER, constants.QUEUE.PROPERTIES, function(error2, q){
        if (error2){
            throw error2;
        }
        ch.bindQueue(q.queue, constants.EXCHANGE.NAME, constants.SERVICES.USER);
        ch.prefetch(1); 
        ch.consume(q.queue, function reply(msg){
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
        });
    });
}

/* the port the server will listen on */
const PORT = 8006;

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
