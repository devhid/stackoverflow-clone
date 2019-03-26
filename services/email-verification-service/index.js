/* library imports */
const express = require('express');
const asyncWrapper = require('express-async-await');

/* internal imports */
const database = require('./database');

/* initialize express application */
const app = express();
asyncWrapper(app);

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
        response = {"status": "error", "error": "One or more fields are empty."};
        return res.json(response);
    }

    let emailExists = await database.emailExists(email);
    if(!emailExists) {
        response = {"status": "error", "error": "No account under that email was registered."};
        return res.json(response);
    }

    let verified = await database.isVerified(email);
    if(verified) {
        response = {"status": "error", "error": "Email is already verified."};
        return res.json(response);
    }

    let success = await database.verifyEmail(email, key);
    if(!success) {
        response = {"status": "error", "error": "Could not verify email. Incorrect key."};
        return res.json(response);
    }

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
