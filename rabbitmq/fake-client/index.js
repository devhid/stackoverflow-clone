/* library imports */
const express = require('express');
const amqp = require('amqplib/callback_api');

/* internal imports */
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
                setTimeout(listen, 1000);
            });
        });
    });
}
catch (err){
    console.log(`[Rabbit] Failed to connect ${err}`);
}

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

function listen(){
    ch.assertQueue('', constants.QUEUE.PROPERTIES, function(error2, q){
        if (error2){
            throw error2;
        }
        ch.bindQueue(q.queue, constants.EXCHANGE.NAME, constants.SERVICES.QA);
        ch.prefetch(1); 
        ch.consume(q.queue, function reply(msg){
            console.log(`Received ${msg.content.toString()}`);
            // JSON.parse(msg.content.toString()); // gives back the data object
            ch.sendToQueue(msg.properties.replyTo,
                Buffer.from(JSON.stringify(addQuestion(msg))), {
                    correlationId: msg.properties.correlationId
                }
            );
            ch.ack(msg);
        });
    });
}

function addQuestion(request){
    return {
        status: constants.STATUS_200,
        response: {status: "OK"}
    };
}

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
