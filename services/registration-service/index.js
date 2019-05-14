/* library imports */
const express = require('express');
const rabbot = require('rabbot');

/* internal imports */
const database = require('./database');
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
    //host: "192.168.122.13",
    ssl: false
});

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
        console.log('[Rabbot] Rabbot configured...');
    }).catch(err => {
        console.log(`[Rabbot] err ${err}`);
    });

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
async function addUser(request){
    let req = request.body;
    try {
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
            request.reply({status: status, response: response});
            request.ack();
            return;
        }
        let userExists = await database.userExists(email, username);

        if (userExists) {
            console.log('user exists');
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
                    console.log(err);
                    status = constants.STATUS_503;
                    response = { "status": "error" };
                    request.reply({status: status, response: response});
                    request.ack();
                    return;
                }
                else {
                    console.log('mail sent');
                    status = constants.STATUS_200;
                    response = { "status": "OK" };
                    request.reply({status: status, response: response});
                    request.ack();
                    return;
                }
            }
        );
    } catch (err){
        console.log(`[Register] addUser err ${err}`);
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
var server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(){
    rabbot.shutdown(true);
    server.close();
}
