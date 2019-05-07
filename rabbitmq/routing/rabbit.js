/* library imports */
const rabbot = require('rabbot');
const uuidv4 = require('uuid/v4');

/* internal imports */
const constants = require('./constants');
const DBResult = require('./dbresult').DBResult;

/* configure rabbot */
rabbot.configure(constants.RABBOT_SETTINGS).done(function(){
    console.log('[Rabbot-Router] Rabbot configured...');
});

/**
 * Publishes a message with the specified routing key.
 * @param {string} routing_key the routing key with which to publish the msg
 * @param {string} type type of the message
 * @param {Request} msg object with Request data
 */
function publishMessage(routing_key, type, msg){
    let correlationId = uuidv4();
    return rabbot.request(constants.EXCHANGE.NAME,
        {
            routingKey: routing_key,
            type: type,
            correlationId: correlationId,
            body: msg,
            persistent: true
        }
    ).then(reply => {
        reply.ack();
        return new DBResult(constants.DB_RES_SUCCESS, reply.body);
    }).catch(err => {
        console.log(`[Rabbot-Routing] Error ${JSON.stringify(err)}`);
        return new DBResult(constants.DB_RES_ERROR, err);
    });
}

module.exports = {
    shutdown: shutdown,
    publishMessage: publishMessage
}