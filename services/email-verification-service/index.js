/* library imports */
const express = require('express');
const amqp = require('amqplib/callback_api');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

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
            });
            setTimeout(listen, 1000);
        });
    });
}
catch (err){
    console.log(`[Rabbit] Failed to connect ${err}`);
}

/* Listen for responses */
function listen(){
    ch.assertQueue('', constants.QUEUE.PROPERTIES, function(error2, q){
        if (error2){
            throw error2;
        }
        let resp = ch.bindQueue(q.queue, constants.EXCHANGE.NAME, constants.KEYS.EMAIL);
        ch.prefetch(1); 
        ch.consume(q.queue, function reply(msg){
            console.log(`Received ${msg.content.toString()}`);
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
                Buffer.from(JSON.stringify(addQuestion(msg))), {
                    correlationId: msg.properties.correlationId
                }
            );
            ch.ack(msg);
        });
    });
}

/* the port the server will listen on */
const PORT = 8003;

/* parse incoming requests data as json */
app.use(express.json());

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
            "data": {
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
            "data": {
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
            "data": {
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
            "data": {
                "status": constants.STATUS_ERR, 
                "error": "Could not verify email. Incorrect key."
            }
        };
        return res.json(response);
    }

    response = { 
        "status": constants.STATUS_200,
        "data": {
            "status": constants.STATUS_OK,
        }
    };
    return res.json(response);
}

/* Checks if any of the variables in the fields array are empty. */
function notEmpty(fields) {
    for(let i in fields) {
        if(!fields[i]) { return false; }
    }
    return true;
}

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
