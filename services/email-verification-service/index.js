/* library imports */
const express = require('express');

/* internal imports */
const database = require('./database');
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
    res.set('Access-Control-Allow-Origin', constants.FRONT_END.hostname);
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Credentials', 'true'); 
    next();
});

app.post('/verify', async(req, res) => {
    let endpoint = constants.ENDPOINTS.EMAIL_VERIFY;
    let dbRes = await processRequest(req, endpoint);
    res.status(dbRes.status);
    return res.json(dbRes.response);
});

async function processRequest(req){
    let response = {};
    switch (endpoint) {
        case constants.ENDPOINTS.EMAIL_VERIFY:
            response = await verify(req);
            break;
        default:
            break;
    }
    return response;
}

function main(){
    try {
        setupConnection();
    } catch (err){
        console.log(`[Rabbit] Failed to connect ${err}`);
    }
}

main();

/* ------------------ ENDPOINTS ------------------ */

/* Verifies a user's email and confirms the account registration. */
/*app.post('/verify', async (req, res) => {
    const email = req.body["email"];
    const key = req.body["key"];

    let response = {};

    if(!notEmpty([email, key])) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "One or more fields are empty."};
        return res.json(response);
    }

    let emailExists = await database.emailExists(email);
    if(!emailExists) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "No account under that email was registered."};
        return res.json(response);
    }

    let verified = await database.isVerified(email);
    if(verified) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "Email is already verified."};
        return res.json(response);
    }

    let success = await database.verifyEmail(email, key);
    if(!success) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "Could not verify email. Incorrect key."};
        return res.json(response);
    }

    res.status(constants.STATUS_200);
    response = {"status": "OK"};
    return res.json(response);
});*/

async function verify(req) {
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
        return response;
    }

    let emailExists = await database.emailExists(email);
    if(!emailExists) {
        response = { 
            "status": constants.STATUS_400,
            "response": {
                "status": "error", 
                "error": "No account under that email was registered."
            }
        };
        return response;
    }

    let verified = await database.isVerified(email);
    if(verified) {
        response = { 
            "status": constants.STATUS_400,
            "response": {
                "status": constants.STATUS_ERR, 
                "error": "Email is already verified."
            }
        };
        return response;
    }

    let success = await database.verifyEmail(email, key);
    if(!success) {
        response = { 
            "status": constants.STATUS_400,
            "response": {
                "status": constants.STATUS_ERR, 
                "error": "Could not verify email. Incorrect key."
            }
        };
        return response;
    }

    response = { 
        "status": constants.STATUS_200,
        "response": {
            "status": constants.STATUS_OK,
        }
    };
    return response;
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
    if (conn) conn.close();
    if (ch) ch.close();
    server.close();
}
