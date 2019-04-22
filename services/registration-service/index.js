/* library imports */
const express = require('express');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 2000;

/* connect to the email server */
const emailjs = require('emailjs')
const mail_server = emailjs.server.connect({
    user: "ubuntu",
    password: "",
    host: "mail.cse356-mailserver.cloud.compas.cs.stonybrook.edu",
    ssl: false
});

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

app.get('/emailtest', async(req, res) => {
    console.log(mail_server);
    mail_server.send({
        text: "Email received.",
        from: "no-reply <ubuntu@cse356-mailserver.cloud.compas.cs.stonybrook.edu>",
        to: "bofinexe@postemail.net",
        subject: "Test email"
        }, function(err, message) {
            console.log(err);
            console.log(message);
    });
});

/* Register a user if they do not already exist. */
app.post('/adduser', async (req, res) => {
    console.log(req.body);
    const email = req.body["email"];
    const username = req.body["username"];
    const password = req.body["password"];

    let response = {};

    if(!notEmpty([email, username, password])) {
        res.status(constants.STATUS_400);
        response = {"status": "error", "error": "One or more fields are empty."};
        return res.json(response);
    }
    let userExists = await database.userExists(email, username);

    if(userExists) {
        res.status(constants.STATUS_400)
        response = {"status": "error", "error": "A user with that email or username already exists."};
        return res.json(response);
    }

    const key = await database.addUser(email, username, password);
    const message = "validation key: \<" + key + "\>";

    mail_server.send({
        text: message,
        from: "no-reply <ubuntu@cse356-mailserver.cloud.compas.cs.stonybrook.edu>",
        to: email,
        subject: "Validation Key"
        }, function(err, message) {
            //console.log(err);
            //console.log(message);
    });

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
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
