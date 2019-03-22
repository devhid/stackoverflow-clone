/* library imports */
const express = require('express');
const asyncWrapper = require('express-async-await');

/* internal imports */
const database = require('./database');

/* initialize express application */
const app = express();
asyncWrapper(app);

/* the port the server will listen on */
const PORT = 5000;

/* parse incoming requests data as json */
app.use(express.json());

/* Register a user if they do not already exist. */
app.post('/adduser', async (req, res) => {
    let email = req.body["email"];
    let username = req.body["username"];
    let password = req.body["password"];

    if(!notEmpty([email, username, password])) {
        let response = {"status": "error", "error": "One or more fields are empty."};
        return res.json(response);
    }
    let userExists = await database.userExists(email, username);

    if(userExists) {
        let response = {"status": "error", "error": "A user with that email or username already exists."};
        return res.json(response);
    }

    database.addUser(email, username, password);    

    let response = {"status": "OK"};
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