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
const PORT = 8003;

/* parse incoming requests data as json */
app.use(express.json());

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
                ch.assertQueue(constants.SERVICES.EMAIL, constants.QUEUE.PROPERTIES, function(error3, q){
                    if (error3){
                        throw error3;
                    }
                    console.log(`[Rabbit] Asserted queue... ${q.queue}`);
                    ch.bindQueue(q.queue, ex.exchange, constants.SERVICES.EMAIL);
                    console.log(`[Rabbit] Binded ${q.queue} with key ${constants.SERVICES.EMAIL} to ${ex.exchange}...`);
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
    let data = JSON.parse(msg.content.toString()); // gives back the data object
    let endpoint = data.endpoint;
    let response = {};
    switch (endpoint) {
        case constants.ENDPOINTS.EMAIL_VERIFY:
            response = await verify(data);
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

/* Verifies a user's email and confirms the account registration. */
/*app.post('/verify', async (req, res) => {
    const email = req.body["email"];
    const key = req.body["key"];

    let response = {};

    if(!notEmpty([email, key])) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "One or more fields are empty."};
        return res.json(response);
    }

    let emailExists = await database.emailExists(email);
    if(!emailExists) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "No account under that email was registered."};
        return res.json(response);
    }

    let verified = await database.isVerified(email);
    if(verified) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "Email is already verified."};
        return res.json(response);
    }

    let success = await database.verifyEmail(email, key);
    if(!success) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "Could not verify email. Incorrect key."};
        return res.json(response);
    }

    res.status(constants.STATUS_200);
    response = {"status": "OK"};
    return res.json(response);
});*/

async function verify(req) {
    const email = req.body["email"];
    const key = req.body["key"];

    let response = {};

    if(!notEmpty([email, key])) {
        response = { 
            "status": constants.STATUS_400,
            "response": {
                "status": "error", 
                "error": "One or more fields are empty."
            }
        };
        return response;
    }

    let emailExists = await database.emailExists(email);
    if(!emailExists) {
        response = { 
            "status": constants.STATUS_400,
            "response": {
                "status": "error", 
                "error": "No account under that email was registered."
            }
        };
        return response;
    }

    let verified = await database.isVerified(email);
    if(verified) {
        response = { 
            "status": constants.STATUS_400,
            "response": {
                "status": constants.STATUS_ERR, 
                "error": "Email is already verified."
            }
        };
        return response;
    }

    let success = await database.verifyEmail(email, key);
    if(!success) {
        response = { 
            "status": constants.STATUS_400,
            "response": {
                "status": constants.STATUS_ERR, 
                "error": "Could not verify email. Incorrect key."
            }
        };
        return response;
    }

    response = { 
        "status": constants.STATUS_200,
        "response": {
            "status": constants.STATUS_OK,
        }
    };
    return response;
}

/* Checks if any of the variables in the fields array are empty. */
function notEmpty(fields) {
    for(let i in fields) {
        if(!fields[i]) { return false; }
    }
    return true;
}

/* Start the server. */
let server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));

/* Graceful shutdown */
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown(){
    if (conn) conn.close();
    if (ch) ch.close();
    server.close();
}
