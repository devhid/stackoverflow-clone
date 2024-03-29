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
const PORT = 8002;

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
    queue: constants.SERVICES.EMAIL,
    type: constants.ENDPOINTS.EMAIL_VERIFY,
    autoNack: false,
    handler: verify
});

/* configure rabbot */
rabbot.configure(constants.RABBOT_SETTINGS)
    .then(function(){
        console.log('[Rabbot-Router] Rabbot configured...');
    }).catch(err => {
        console.log(`[Rabbot-Router] err ${err}`);
    });


/* ------------------ ENDPOINTS ------------------ */

/* Verifies a user's email and confirms the account registration. */
async function verify(request) {
    let req = request.body;
    try {
        const email = req.body["email"];
        const key = req.body["key"];

        let response = {};

        if(!notEmpty([email, key])) {
            response = { 
                "status": constants.STATUS_400,
                "response": {
                    "status": "error", 
                    "error": "One or more fields are empty."
                }
            };
            request.reply(response);
            request.ack();
            return;
        }

        let user = await database.getUser(email);

        // let emailExists = await database.emailExists(email);
        if(user === null) {
            response = { 
                "status": constants.STATUS_400,
                "response": {
                    "status": "error", 
                    "error": "No account under that email was registered."
                }
            };
            request.reply(response);
            request.ack();
            return;
        }

        let verified = database.isVerified(user);
        if(verified) {
            response = { 
                "status": constants.STATUS_400,
                "response": {
                    "status": constants.STATUS_ERR, 
                    "error": "Email is already verified."
                }
            };
            request.reply(response);
            request.ack();
            return;
        }

        let matchesKey = database.matchesKey(user, key);
        if(!matchesKey) {
            response = { 
                "status": constants.STATUS_400,
                "response": {
                    "status": constants.STATUS_ERR, 
                    "error": "Could not verify email. Incorrect key."
                }
            };
            request.reply(response);
            request.ack();
            return;
        }

        await database.updateVerified(email);

        response = { 
            "status": constants.STATUS_200,
            "response": {
                "status": constants.STATUS_OK,
            }
        };
        request.reply(response);
        request.ack();
    } catch (err){
        console.log(`[Email] verify err ${JSON.stringify(err)}`);
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
