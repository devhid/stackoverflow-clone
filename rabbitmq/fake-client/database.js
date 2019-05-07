/* internal imports */
const constants = require('./constants');

function handle_QA_ADD_Q(request){
    try {
        console.log(`[Rabbot-Client] Received ${JSON.stringify(request)}`);
        request.ack();
        request.reply({status: constants.STATUS_200, response: {status: "OK"}});
    } catch (err){
        console.log(`[Rabbot-Client] Caught err ${JSON.stringify(err)}`);
        request.nack();
    }
}

module.exports = {
    HANDLERS: {
        QA_ADD_Q: handle_QA_ADD_Q
    }
}