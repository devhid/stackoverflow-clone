/* library imports */
const express = require('express');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8003;

/* parse incoming requests data as json */
app.use(express.json());

/* Verifies a user's email and confirms the account registration. */
app.post('/verify', async (req, res) => {
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
