/* external imports */
const express = require('express');
const asyncWrapper = require('express-async-await');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

/* internal imports */
const database = require('./database');

/* initialize express application */
const app = express();
asyncWrapper(app);

/* the port the server will listen on */
const PORT = 3000;

/* options for the redis store */
const redisOptions = {
    host: '64.52.162.153',
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
    cookie: {domain: "kellogs.cse356.compas.cs.stonybrook.edu"},
    store: new RedisStore(redisOptions)
};

/* handle user sessions */
app.use(session(sessionOptions));

/* parse incoming requests data as json */
app.use(express.json());

/* handle user logins */
app.post('/login', async (req, res) => {
    const username = req.body['username'];
    const password = req.body['password'];

    let response = {};

    if(req.session.user) {
        response = {"status": "error", "error": "Already logged in."};
        return res.json(response);
    }

    if(!notEmpty([username, password])) {
        response = {"status": "error", "error": "One or more fields are missing."};
        return res.json(response);
    }

    const userExists = await database.userExists(username);
    if(!userExists) {
        response = {"status": "error", "error": "No user exists with that username."};
        return res.json(response);
    }

    const canLogin = await database.canLogin(username);
    if(!canLogin) {
        response = {"status": "error", "error": "Email must be verified before logging in."};
        return res.json(response);
    }

    const success = await database.authenticate(username, password);
    if(!success) {
        response = {"status": "error", "error": "The password entered is incorrect."};
        return res.json(response);
    }

    req.session.user = await database.getUser(username);
    
    response = {"status": "OK"};
    return res.json(response);
});

/* a counter for sessions */
app.get('/increment', function incrementCounter(req, res) {
    req.session.count = req.session.count ? req.session.count++ : 1;

    return res.json({
        message : 'Incremented Count',
        count: req.session.count
    });
});

/* handles log outs. */
app.post('/logout', function destroySession(req, res) {
    let response = {};

    console.log(req.session);

    if(!req.session.user) {
        response = {"status": "error", "error": "Already logged out."};
        return res.json(response);
    }

    req.session.destroy(function done() {
        response = {"status": "OK"};
        return res.json(response);
    });
});

/* Checks if any of the variables in the fields array are empty. */
function notEmpty(fields) {
    for(let i in fields) {
        if(!fields[i]) { return false; }
    }
    return true;
}

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));