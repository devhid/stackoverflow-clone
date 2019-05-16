/* external imports */
const express = require('express');
const rabbot = require('rabbot');
const debug = require('debug');
const log = debug('authentication');

/* internal imports */
const database = require('./mdb');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8001;

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
  //res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.set('Access-Control-Allow-Origin', 'http://kellogs.cse356.compas.cs.stonybrook.edu');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Credentials', 'true'); 
  next();
});

rabbot.nackOnError();

/* install handlers */
rabbot.handle({
    queue: constants.SERVICES.AUTH,
    type: constants.ENDPOINTS.AUTH_LOGIN,
    autoNack: false,
    handler: login
});

rabbot.handle({
    queue: constants.SERVICES.AUTH,
    type: constants.ENDPOINTS.AUTH_LOGOUT,
    autoNack: false,
    handler: logout
});

/* configure rabbot */
rabbot.configure(constants.RABBOT_SETTINGS)
    .then(function(){
        log('Rabbot configured...');
    }).catch(err => {
        log(`[Error] rabbot.configure() - ${err}`);
    });

/* ------------------ ENDPOINTS ------------------ */

async function login(request) {
    let req = request.body;
    try {
        const username = req.body['username'];
        const password = req.body['password'];

        let response = {};

        if(req.session.user) {
            response = { 
                "status": constants.STATUS_400,
                "response": {
                    "status": constants.STATUS_ERR, 
                    "error": "Already logged in."
                }
            };
            request.reply(response);
            request.ack();
            return;
        }

        if(!notEmpty([username, password])) {
            response = { 
                "status": constants.STATUS_400,
                "response": {
                    "status": constants.STATUS_ERR, 
                    "error": "One or more fields are missing."
                }
            };
            request.reply(response);
            request.ack();
            return;
        }

        let user = await database.getUser(username);
        if (user == null){
            response = { 
                "status": constants.STATUS_400,
                "response": {
                    "status": constants.STATUS_ERR, 
                    "error": "No user exists with that username."
                }
            };
            request.reply(response);
            request.ack();
            return;
        }
        if (!database.isVerified(user)){
            response = { 
                "status": constants.STATUS_401,
                "response": {
                    "status": constants.STATUS_ERR, 
                    "error": "Email must be verified before logging in."
                }
            };
            request.reply(response);
            request.ack();
            return;
        }
        let success = database.authenticate(user, password);
        if(!success) {
            response = { 
                "status": constants.STATUS_401,
                "response": {
                    "status": constants.STATUS_ERR, 
                    "error": "The password entered is incorrect."
                }
            };
            request.reply(response);
            request.ack();
            return;
        }

        response = { 
            "status": constants.STATUS_200,
            "response": {
                "status": constants.STATUS_OK
            },
            "user": user
        };
        request.reply(response);
        request.ack();
    } catch (err){
        log(`[Error] login() - ${JSON.stringify(err)}`);
        request.nack();
    }
}

async function logout(request) {
    let req = request.body;
    try {
        let response = {};

        if(!req.session.user) {
            response = { 
                "status": constants.STATUS_400,
                "response": {
                    "status": constants.STATUS_ERR, 
                    "error": "Already logged out."
                }
            };
            request.reply(response);
            request.ack();
        }
    
        response = {
            "status": constants.STATUS_200,
            "response": {
                "status": constants.STATUS_OK
            }
        };
        request.reply(response);
        request.ack();
    } catch (err){
        log(`[Error]k logout() - ${JSON.stringify(err)}`);
        request.nack();
    }
}

/* Checks if any of the variables in the fields array are empty. */
function notEmpty(fields) {
    for(let i in fields) {
        if(!fields[i]) { return false; }
    }
    return true;
}

/* Start the server. */
let server = app.listen(PORT, '0.0.0.0', () => log(`Server running on http://0.0.0.0:${PORT}`));

/* Graceful shutdown */
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown(){
    rabbot.shutdown(true);
    server.close();
}
