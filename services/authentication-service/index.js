/* external imports */
const express = require('express');
const rabbot = require('rabbot');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8002;

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
        console.log('[Rabbot] Rabbot configured...');
    }).catch(err => {
        console.log(`[Rabbot] err ${err}`);
    });

/* ------------------ ENDPOINTS ------------------ */

async function login(request) {
    let req = req.body;
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

        const userExists = await database.userExists(username);
        if(!userExists) {
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

        const canLogin = await database.canLogin(username);
        if(!canLogin) {
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

        const success = await database.authenticate(username, password);
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

        let user = await database.getUser(username);

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
        console.log(`[Auth] login err ${JSON.stringify(err)}`);
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
        console.log(`[Auth] logout err ${JSON.stringify(err)}`);
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
let server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));

/* Graceful shutdown */
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown(){
    rabbot.shutdown(true);
    server.close();
}
