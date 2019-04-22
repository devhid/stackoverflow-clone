/* external imports */
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const amqp = require('amqplib/callback_api');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8002;

/* options for the redis store */
const redisOptions = {
    host: '192.168.122.27',
    port: 6379,
    pass: 'SWzpgvbqx8GY6Ryvh9HSVAPv6+m6KgqBHesiufT3'
};

/* options for the session */
const sessionOptions = {
    name: 'soc_login',
    secret: 'EditThisLaterWithARealSecret',
    unset: 'destroy',
    resave: false,
    saveUninitialized: true,
    logErrors: true,
    store: new RedisStore(redisOptions)
};

/* handle user sessions */
app.use(session(sessionOptions));

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
                setTimeout(listen, 1000);
            });
        });
    });
}
catch (err){
    console.log(`[Rabbit] Failed to connect ${err}`);
}

/* Listen for responses */
async function listen(){
    ch.assertQueue(constants.SERVICES.AUTH, constants.QUEUE.PROPERTIES, function(error2, q){
        if (error2){
            throw error2;
        }
        ch.bindQueue(q.queue, constants.EXCHANGE.NAME, constants.KEYS.EMAIL);
        ch.prefetch(1); 
        ch.consume(q.queue, function reply(msg){
            console.log(`Received ${msg.content.toString()}`);
            let data = JSON.parse(msg.content.toString()); // gives back the data object
            let endpoint = data.endpoint;
            let response = {};
            switch (endpoint) {
                case constants.ENDPOINTS.AUTH_LOGIN:
                    response = await login(data);
                    break;
                case constants.ENDPOINtS.AUTH_LOGOUT:
                    response = await logout(data);
                    break;
                
                default:
                    break;
            }

            ch.sendToQueue(msg.properties.replyTo,
                Buffer.from(JSON.stringify(response)), {
                    correlationId: msg.properties.correlationId
                }
            );
            ch.ack(msg);
        });
    });
}

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

    req.session.user = await database.getUser(username);

    response = { 
        "status": constants.STATUS_200,
        "response": {
            "status": constants.STATUS_OK
        }
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

    req.session.destroy(function done() {
        response = { 
            "status": constants.STATUS_200,
            "response": {
                "status": constants.STATUS_OK, 
            }
        };
        return response;
    });
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
