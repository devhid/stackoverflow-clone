/* library imports */
const express = require('express');
const rabbot = require('rabbot');
const debug = require('debug');
const log = debug('registration');

/* internal imports */
const database = require('./db');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8005;

/* connect to the email server */
const emailjs = require('emailjs')
const mail_server = emailjs.server.connect({
    user: "ubuntu",
    password: "",
    host: "192.168.122.25",
    ssl: false
});

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
  res.set('Access-Control-Allow-Origin', 'http://kellogs.cse356.compas.cs.stonybrook.edu');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Credentials', 'true');
  next();
});

rabbot.nackOnError();

/* install handlers */
rabbot.handle({
    queue: constants.SERVICES.REGISTER,
    type: constants.ENDPOINTS.REGISTER,
    autoNack: false,
    handler: addUser
});

/* configure rabbot */
rabbot.configure(constants.RABBOT_SETTINGS)
    .then(function(){
        log('Rabbot configured...');
    }).catch(err => {
        log(`[Error] rabbot.configure() - ${err}`);
    });

/* ------------------ ENDPOINTS ------------------ */

app.get('/emailtest', async(req, res) => {
    mail_server.send({
        text: "Email received.",
        from: "no-reply <>",
        to: "tijo@smartbusiness.me",
        subject: "Test email"
        }, function(err, message) {
            if(err) {
                log(`[Error]: /emailtest - ${err}`);
            } else {
                log(`/emailtest - ${message}`);  
            }  
        });
});

/* Register a user if they do not already exist. */
async function addUser(request){
    let req = request.body;
    try {
        const email = req.body["email"];
        const username = req.body["username"];
        const password = req.body["password"];

        let status = constants.STATUS_200;
        let response = {};

        if (!notEmpty([email, username, password])) {
            status = constants.STATUS_400;
            response = {"status": "error", "error": "One or more fields are empty."};
            request.reply({status: status, response: response});
            request.ack();
            return;
        }
        let userExists = await database.userExists(email, username);

        if (userExists) {
            status = constants.STATUS_409;
            response = {"status": "error", "error": "A user with that email or username already exists."};
            request.reply({status: status, response: response});
            request.ack();
            return;
        }

        const key = await database.addUser(email, username, password);
        const message = "validation key: \<" + key + "\>";

        mail_server.send({
            text: message,
            from: "no-reply",
            to: email,
            subject: "Validation Key"
            }, 
            function(err, message) {
                if (err) {
                    log(`[Error]: mail_server.send() - ${err}`)
                    status = constants.STATUS_503;
                    response = { "status": "error" };
                    request.reply({status: status, response: response});
                    request.ack();
                    return;
                }
                else {
                    log(`mail_server.send() - ${message}`)
                    status = constants.STATUS_200;
                    response = { "status": "OK" };
                    request.reply({status: status, response: response});
                    request.ack();
                    return;
                }
            }
        );
    } catch (err){
        log(`[Error] addUser() - ${err}`);
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
var server = app.listen(PORT, '0.0.0.0', () => log(`Server running on http://0.0.0.0:${PORT}`));

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(){
    rabbot.shutdown(true);
    server.close();
}
