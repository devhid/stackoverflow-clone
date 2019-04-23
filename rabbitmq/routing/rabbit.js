// /* library imports */
// const amqp = require('amqplib/callback_api');
// const uuidv4 = require('uuid/v4');

// /* internal imports */
// const constants = require('./constants');
// const DBResult = require('./dbresult').DBResult;

// let correlationId = null;

// /* amqplib connection */
// var conn = null;
// var ch = null;
// try {
//     amqp.connect(constants.AMQP_HOST, function(error0, connection) {
//         if (error0) {
//             throw error0;
//         }
//         conn = connection;
//         connection.createChannel(function(error1, channel) {
//             if (error1) {
//                 throw error1;
//             }
//             ch = channel;
//             channel.assertExchange(constants.EXCHANGE.NAME, constants.EXCHANGE.TYPE, constants.EXCHANGE.PROPERTIES, (err, ok) => {
//                 if (err){
//                     throw err;
//                 }
//                 console.log(`ok ${JSON.stringify(ok)}`);
//             });
//         });
//     });
//     // conn = await amqp.connect(constants.AMQP_HOST);
//     // ch = await conn.createChannel();
//     // await ch.assertExchange(constants.EXCHANGE.NAME, constants.EXCHANGE.TYPE, constants.EXCHANGE.PROPERTIES);
//     console.log(`ok ${JSON.stringify(ok)}`);
// }
// catch (err){
//     console.log(`[Rabbit] Failed to connect ${err}`);
// }

// /**
//  * Publishes a message with the specified routing key.
//  * @param {string} routing_key the routing key of the Queue (used as the routing key)
//  * @param {Object} data data to encapsulate in a message
//  */
// async function publishMessage(routing_key, data){
//     let dbResult = new DBResult();
//     return new Promise( (resolve,reject) => {
//         ch.assertQueue(constants.CALLBACK_QUEUE, constants.QUEUE.PROPERTIES, function(error2, q) {
//             if (error2) {
//                 dbResult.status = constants.RMQ_ERROR;
//                 dbResult.data = error2;
//                 reject(dbResult);
//             }

//             correlationId = uuidv4();
//             console.log(` [x] Requesting ${JSON.stringify(data)}, corrId=${correlationId}`);

//             ch.publish(constants.EXCHANGE.NAME, 
//                 routing_key, 
//                 Buffer.from(JSON.stringify(data)), 
//                 { correlationId: correlationId, replyTo: q.queue, persistent: true }
//             );

//             ch.consume(q.queue, (msg) => {
//                 if (msg.properties.correlationId === correlationId){
//                     console.log(` [.] Got ${msg.content.toString()}, corrId=${correlationId}`);
//                     ch.ack(msg);
//                     dbResult.status = constants.RMQ_SUCCESS;
//                     dbResult.data = JSON.parse(msg.content.toString());
//                     resolve(dbResult);
//                     return;
//                 }
//                 console.log(` [.] Received corrId=${msg.properties.correlationId}, expected=${correlationId}`);
//             }, { noAck: false });
//         });
//     });
// }

// // async function publishMessage(routing_key, data){
// //     let dbResult = new DBResult();

// //     try {
// //         await ch.assertQueue(constants.CALLBACK_QUEUE, constants.QUEUE.PROPERTIES);
// //         correlationId = uuid4v();

// //         ch.publish(constants.EXCHANGE.NAME, 
// //             routing_key, 
// //             Buffer.from(JSON.stringify(data)), 
// //             { correlationId: correlationId, replyTo: q.queue, persistent: true }
// //         );

// //         let msg = await ch.consume(q.queue, { noAck: false });

// //         if (msg.properties.correlationId === correlationId) {
// //             console.log(` [.] Got ${msg.content.toString()}, corrId=${correlationId}`);
// //             ch.ack(msg);
// //             dbResult.status = constants.RMQ_SUCCESS;
// //             dbResult.data = JSON.parse(msg.content.toString());
// //             return;
// //         }
// //         console.log(` [.] Received corrId=${msg.properties.correlationId}, expected=${correlationId}`);
// //     }
// //     catch (err) {
// //         dbResult.status = constants.RMQ_ERROR;
// //         dbResult.data = error2;
// //         console.log(err);
// //     }
// // }

// function shutdown(){
//     if (ch) ch.close();
//     if (conn) conn.close();
// }

// module.exports = {
//     publishMessage: publishMessage,
//     shutdown: shutdown
// }

/* library imports */
const amqp = require('amqplib/callback_api');

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

/* helpers */
function generateUuid() {
    return Math.random().toString() +
        Math.random().toString() +
        Math.random().toString();
}

/**
 * Publishes a message with the specified routing key.
 * @param {string} bind_key the binding key of the Queue (used as the routing key)
 * @param {Request} request Express Request object
 */
async function publishMessage(bind_key, request){
    let dbResult = new DBResult();
    return new Promise( (resolve,reject) => {
        ch.assertQueue('', constants.QUEUE.PROPERTIES, function(error2, q) {
            if (error2) {
                dbResult.status = constants.DB_RES_ERROR;
                dbResult.data = error2;
                reject(dbResult);
            }
            var correlationId = generateUuid();

            console.log(` [x] Requesting ${JSON.stringify(request)}`);

            ch.publish(constants.EXCHANGE.NAME, 
                bind_key, 
                Buffer.from(JSON.stringify(request)), 
                { correlationId: correlationId, replyTo: q.queue, persistent: true }
            );

            ch.consume(q.queue, function(msg) {
                console.log(`Received ${msg.content.toString()}`);
                if (msg.properties.correlationId === correlationId) {
                    console.log(` [.] Got ${msg}`);
                    ch.ack(msg);
                    dbResult.status = constants.DB_RES_SUCCESS;
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