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

/* connect to the email server */
const emailjs = require('emailjs')
const mail_server = emailjs.server.connect({
    user: "ubuntu",
    password: "",
    host: "192.168.122.34",
    //host: "192.168.122.13",
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

app.post('/adduser', async(req, res) => {
    let endpoint = constants.ENDPOINTS.REGISTER;
    let dbRes = await processRequest(req, endpoint);
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
        case constants.ENDPOINTS.REGISTER:
            response = await addUser(req);
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

app.get('/emailtest', async(req, res) => {
    console.log(mail_server);
    mail_server.send({
        text: "Email received.",
        from: "no-reply <>",
        to: "tijo@smartbusiness.me",
        subject: "Test email"
        }, function(err, message) {
            console.log(err);
            console.log(message);
    });
});

/* Register a user if they do not already exist. */
async function addUser(req){
    const email = req.body["email"];
    const username = req.body["username"];
    const password = req.body["password"];
    console.log(email + " " + username + " " + password);

    let status = constants.STATUS_200;
    let response = {};

    if (!notEmpty([email, username, password])) {
	console.log('empty fields');
        status = constants.STATUS_400;
        response = {"status": "error", "error": "One or more fields are empty."};
        return {status: status, response: response};
    }
    let userExists = await database.userExists(email, username);

    if (userExists) {
	console.log('user exists');
        status = constants.STATUS_409;
        response = {"status": "error", "error": "A user with that email or username already exists."};
        return {status: status, response: response};
    }

    const key = await database.addUser(email, username, password);
    const message = "validation key: \<" + key + "\>";

    mail_server.send({
        text: message,
        from: "no-reply",
        to: email,
        subject: "Validation Key"
        }, function(err, message) {
            console.log(err);
            /*if (err) {
                console.log(err);
                status = constants.STATUS_503;
                response = { "status": "error" };
                return { status: status, response: response };
            } else {
                console.log('mail sent');
                status = constants.STATUS_200;
                response = { "status": "OK" };
                return { status: status, response: response };
            }*/
        }
    );
    
    console.log('mail sent');
    status = constants.STATUS_200;
    response = { "status": "OK" };
    return { status: status, response: response };
}

/* Checks if any of the variables in the fields array are empty. */
function notEmpty(fields) {
    for(let i in fields) {
        if(!fields[i]) { return false; }
    }
    return true;
}

/* Start the server. */
var server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(){
    server.close();
}
