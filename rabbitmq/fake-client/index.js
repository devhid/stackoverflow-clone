/* library imports */
const express = require('express');

/* internal imports */
const constants = require('./constants');
const rabbit = require('./rabbit');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8008;

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

amqp.connect(constants.AMQP_HOST, function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }

        channel.assertQueue('', constants.QUEUE.PROPERTIES, function(error2, q){
            if (error2){
                throw error2;
            }
            channel.bindQueue(q.queue, constants.EXCHANGE.NAME, constants.KEYS.QA);
            channel.prefetch(1);
            channel.consume(q.queue, function reply(msg){
                console.log(`Received ${msg.content.toString()}`);
                channel.sendToQueue(msg.properties.replyTo,
                    Buffer.from(JSON.stringify(addQuestion)), {
                        correlationId: msg.properties.correlationId
                    }
                );
                channel.ack(msg);
            });
        });
    });
});


function addQuestion(request){
    return {status: constants.STATUS_OK}
}

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
