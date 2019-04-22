/* library imports */
const express = require('express');
const amqp = require('amqplib/callback_api');

/* internal imports */
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8009;

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
  res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Credentials', 'true');
  next();
});

/* amqplib connection */
var conn = null;
var ch = null;

/**
 * Asserts the Exchange and Queue exists and sets up the connection variables.
 */
function setupConnection(){
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
                ch.assertQueue(constants.SERVICES.QA, constants.QUEUE.PROPERTIES, function(error2, q){
                    if (error2){
                        throw error2;
                    }
                    ch.bindQueue(q.queue, constants.EXCHANGE.NAME, constants.SERVICES.QA);
                    ch.prefetch(1); 
                    ch.consume(q.queue, processRequest);
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
    console.log(`Received ${msg.content.toString()}`);
    // JSON.parse(msg.content.toString()); // gives back the data object
    ch.sendToQueue(msg.properties.replyTo,
        Buffer.from(JSON.stringify(addQuestion(msg))), {
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

function addQuestion(request){
    return {
        status: constants.STATUS_200,
        response: {status: "OK"}
    };
}

/* Start the server. */
var server = app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(){
    if (ch) ch.close();
    if (conn) conn.close();
    server.close();
}
