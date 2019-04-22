/* library imports */
const amqp = require('amqplib/callback_api');

/* internal imports */
const constants = require('./constants');
const DBResult = require('./dbresult').DBResult;

/* helpers */
function generateUuid() {
    return Math.random().toString() +
        Math.random().toString() +
        Math.random().toString();
}

/**
 * Creates a RabbitMQ exchange as specified by options in constants.
 */
function createExchange(){
    amqp.connect(constants.AMQP_HOST, function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
            if (error1) {
                throw error1;
            }
            channel.assertExchange(constants.EXCHANGE.NAME, constants.EXCHANGE.TYPE, constants.EXCHANGE.PROPERTIES);
        });
        connection.close();
    });
}

/**
 * Publishes a message with the specified routing key.
 * @param {string} bind_key the binding key of the Queue (used as the routing key)
 * @param {Request} request Express Request object
 */
async function publishMessage(bind_key, request){
    let dbResult = new DBResult();
    return new Promise( (resolve,reject) => {
        amqp.connect(constants.AMQP_HOST, function(error0, connection) {
            if (error0) {
                dbResult.status = constants.DB_RES_ERROR;
                dbResult.data = error0;
                reject(dbResult);
            }
            connection.createChannel(function(error1, channel) {
                if (error1) {
                    dbResult.status = constants.DB_RES_ERROR;
                    dbResult.data = error1;
                    reject(dbResult);
                }
                channel.assertQueue(bind_key, constants.QUEUE.PROPERTIES, function(error2, q) {
                    if (error2) {
                        dbResult.status = constants.DB_RES_ERROR;
                        dbResult.data = error2;
                        reject(dbResult);
                    }
                    var correlationId = generateUuid();
    
                    console.log(` [x] Requesting ${request}`);
    
                    channel.publish(constants.EXCHANGE.NAME, bind_key, 
                        Buffer.from(JSON.stringify(request), {
                            correlationId: correlationId,
                            replyTo: q.queue,
                            persistent: true
                        })
                    );

                    channel.consume(q.queue, function(msg) {
                        if (msg.properties.correlationId === correlationId) {
                            console.log(` [.] Got ${msg}`);
                            channel.ack(msg);
                            connection.close();
                            dbResult.status = constants.DB_RES_SUCCESS;
                            dbResult.data = JSON.parse(msg.content.toString());
                            resolve(dbResult);
                        }
                    }, { noAck: false });
    
                });
            });
        }); 
    });
}

module.exports = {
    createExchange: createExchange,
    publishMessage: publishMessage
}