/* library imports */
const amqp = require('amqplib/callback_api');
const uuidv4 = require('uuid/v4');

/* internal imports */
const constants = require('./constants');
const DBResult = require('./dbresult').DBResult;

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
        });
    });
}
catch (err){
    console.log(`[Rabbit] Failed to connect ${err}`);
}

/**
 * Publishes a message with the specified routing key.
 * @param {string} routing_key the routing key of the Queue (used as the routing key)
 * @param {Object} data data to encapsulate in a message
 */
async function publishMessage(routing_key, data){
    let dbResult = new DBResult();
    return new Promise( (resolve,reject) => {
        ch.assertQueue(constants.CALLBACK_QUEUE, constants.QUEUE.PROPERTIES, function(error2, q) {
            if (error2) {
                dbResult.status = constants.RMQ_ERROR;
                dbResult.data = error2;
                reject(dbResult);
            }
            const correlationId = uuidv4();

            console.log(` [x] Requesting ${JSON.stringify(data)}`);

            ch.publish(constants.EXCHANGE.NAME, 
                routing_key, 
                Buffer.from(JSON.stringify(data)), 
                { correlationId: correlationId, replyTo: q.queue, persistent: true }
            );

            ch.consume(q.queue, function(msg) {
                if (msg.properties.correlationId === correlationId) {
                    console.log(` [.] Got ${msg.content.toString()}`);
                    ch.ack(msg);
                    dbResult.status = constants.RMQ_SUCCESS;
                    dbResult.data = JSON.parse(msg.content.toString());
                    resolve(dbResult);
                }
            }, { noAck: false });
        });
    });
}

module.exports = {
    publishMessage: publishMessage
}