/* external imports */
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8001;

/* redis */
const sessionOptions = {
    name: 'soc_login',
    secret: 'KYNxwY2ZeUXo8LKbsbZsMpccLbRewpBr',
    unset: 'destroy',
    resave: false,
    saveUninitialized: true,
    logErrors: true,
    store: new RedisStore(constants.REDIS_OPTIONS)
};
app.use(session(sessionOptions));

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

/* auth service */
app.post('/login', async(req,res) => {
    let endpoint = constants.ENDPOINTS.AUTH_LOGIN;
    let dbRes = await processRequest(req, endpoint);
    if (dbRes.user != undefined){
        req.session.user = dbRes.user;
    }
    res.status(dbRes.status);
    return res.json(dbRes.response);
});

app.post('/logout', async(req,res) => {
    let endpoint = constants.ENDPOINTS.AUTH_LOGOUT;
    let dbRes = await processRequest(req, endpoint);
    if (dbRes.status === constants.STATUS_200){
        req.session.destroy();
    }
    res.status(dbRes.status);
    return res.json(dbRes.response);
});

/**
 * Processes the request contained in the message and replies to the specified queue.
 * @param {Object} msg the message on the RabbitMQ queue
 */
async function processRequest(req, endpoint){
    let response = {};
    switch (endpoint) {
        case constants.ENDPOINTS.AUTH_LOGIN:
            response = await login(req);
            break;
        case constants.ENDPOINTS.AUTH_LOGOUT:
            response = await logout(req);
            break;
        default:
            break;
    }
    return response;
}

/* ------------------ ENDPOINTS ------------------ */

/* handle user logins */
/*app.post('/login', async (req, res) => {
    const username = req.body['username'];
    const password = req.body['password'];

    let response = {};

    if(req.session.user) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "Already logged in."};
        return res.json(response);
    }

    if(!notEmpty([username, password])) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "One or more fields are missing."};
        return res.json(response);
    }

    const userExists = await database.userExists(username);
    if(!userExists) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "No user exists with that username."};
        return res.json(response);
    }

    const canLogin = await database.canLogin(username);
    if(!canLogin) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "Email must be verified before logging in."};
        return res.json(response);
    }

    const success = await database.authenticate(username, password);
    if(!success) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "The password entered is incorrect."};
        return res.json(response);
    }

    req.session.user = await database.getUser(username);

    res.status(constants.STATUS_200);
    response = {"status": "OK"};
    return res.json(response);
});*/

async function login(req) {
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
        return response;
    }

    if(!notEmpty([username, password])) {
        response = { 
            "status": constants.STATUS_400,
            "response": {
                "status": constants.STATUS_ERR, 
                "error": "One or more fields are missing."
            }
        };
        return response;
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
        return response;
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
        return response;
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
        return response;
    }

    let user = await database.getUser(username);

    response = { 
        "status": constants.STATUS_200,
        "response": {
            "status": constants.STATUS_OK
        },
        "user": user
    };
    return response;
}

/* handles log outs. */
/*app.post('/logout', function destroySession(req, res) {
    let response = {};

    if(!req.session.user) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "Already logged out."};
        return res.json(response);
    }

    req.session.destroy(function done() {
        res.status(constants.STATUS_200);
        response = {"status": "OK"};
        return res.json(response);
    });
});*/

async function logout(req) {
    let response = {};

    if(!req.session.user) {
        response = { 
            "status": constants.STATUS_400,
            "response": {
                "status": constants.STATUS_ERR, 
                "error": "Already logged out."
            }
        };
        return response;
    }

    response = {
        "status": constants.STATUS_200,
        "response": {
            "status": constants.STATUS_OK
        }
    };
    return response;
}

/* a counter for sessions */
/* app.get('/increment', function incrementCounter(req, res) {
    req.session.count = req.session.count ? req.session.count++ : 1;

    return res.json({
        message : 'Incremented Count',
        count: req.session.count
    });
});*/

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
