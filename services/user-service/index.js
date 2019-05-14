/* library imports */
const express = require('express');
const rabbot = require('rabbot');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8007;

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
  res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Credentials', 'true');
  next();
});


rabbot.nackOnError();

/* install handlers */
rabbot.handle({
    queue: constants.SERVICES.USER,
    type: constants.ENDPOINTS.USER_GET,
    autoNack: false,
    handler: getUser
});

rabbot.handle({
    queue: constants.SERVICES.USER,
    type: constants.ENDPOINTS.USER_Q,
    autoNack: false,
    handler: getUserQuestions
});

rabbot.handle({
    queue: constants.SERVICES.USER,
    type: constants.ENDPOINTS.USER_A,
    autoNack: false,
    handler: getUserAnswers
});

/* configure rabbot */
rabbot.configure(constants.RABBOT_SETTINGS)
    .then(function(){
        console.log('[Rabbot] Rabbot configured...');
    }).catch(err => {
        console.log(`[Rabbot] err ${err}`);
    });

/* ------------------ ENDPOINTS ------------------ */

/* get information about user */
async function getUser(request){
    let req = request.body;
    try { 
        let status = constants.STATUS_400;
        let response = generateERR();
    
        const username = req.params['uid'];
        if(username === undefined) {
            status = constants.STATUS_400;
            response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
            request.reply({status: status, response: response});
            request.ack();
            return;
        }
    
        const user = await database.getUser(username);
        if(user === null) {
            status = constants.STATUS_400;
            response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;   
            request.reply({status: status, response: response});
            request.ack();
            return;
        }
    
        response = generateOK();
        response[constants.USER_KEY] = user;
    
        status = constants.STATUS_200;
        request.reply({status: status, response: response});
        request.ack();
    } catch (err){
        console.log(`[User] getUser err ${JSON.stringify(err)}`);
        request.nack();
    }
    
}

/* get user's questions */
async function getUserQuestions(request){
    let req = request.body;
    try {
        let status = constants.STATUS_400;
        let response = generateERR();
    
        const username = req.params['uid'];
        if(username === undefined) {
            status = constants.STATUS_400;
            response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
            
            request.reply({status: status, response: response});
            request.ack();
            return;
        }
    
        const user = await database.getUser(username);
        if(user === null) {
            status = constants.STATUS_400;
            response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
            
            request.reply({status: status, response: response});
            request.ack();
            return;
        }
    
        const qids = await database.getUserQuestions(username);
        response = generateOK();
        response[constants.QUESTIONS_KEY] = qids;
        console.log(response);
    
        status = constants.STATUS_200;
        request.reply({status: status, response: response});
        request.ack();
    } catch (err){
        console.log(`[User] getUserQuestions err ${JSON.stringify(err)}`);
        request.nack();
    }
    
}

/* get user's answers */
async function getUserAnswers(request){
    let req = request.body;
    try {
        let status = constants.STATUS_400;
        let response = generateERR();
    
        const username = req.params['uid'];
        if(username === undefined) {
            status = constants.STATUS_400;
            response[constants.STATUS_ERR] = constants.ERR_MISSING_UID;
                
            request.reply({status: status, response: response});
            request.ack();
            return;
        }
    
        const user = await database.getUser(username);
        if(user === null) {
            status = constants.STATUS_400;
            response[constants.STATUS_ERR] = constants.ERR_UNKNOWN_USER;
            
            request.reply({status: status, response: response});
            request.ack();
            return;
        }
    
        const aids = await database.getUserAnswers(username);
    
        response = generateOK();
        response[constants.ANSWERS_KEY] = aids;
    
        status = constants.STATUS_200;
        request.reply({status: status, response: response});
        request.ack();
    } catch (err){
        console.log(`[User] getUserAnswers err ${JSON.stringify(err)}`);
        request.nack();

    }
    
}

/* helper funcs */
function generateOK(){
    let response = {};
    response[constants.STATUS_KEY] = constants.STATUS_OK;
    return response;
}

function generateERR(){
    let response = {};
    response[constants.STATUS_KEY] = constants.STATUS_ERR;
    response[constants.STATUS_ERR] = '';
    return response;
}

/* Start the server. */
var server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(){
    server.close();
}
