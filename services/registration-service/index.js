/* library imports */
const express = require('express');
const amqp = require('amqplib/callback_api');

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

function listen(){
    ch.assertQueue(constants.SERVICES.REGISTER, constants.QUEUE.PROPERTIES, function(error2, q){
        if (error2){
            throw error2;
        }
        ch.bindQueue(q.queue, constants.EXCHANGE.NAME, constants.SERVICES.REGISTER);
        ch.prefetch(1); 
        ch.consume(q.queue, function reply(msg){
            let req = JSON.parse(msg.content.toString()); // gives back the data object
            let endpoint = req.endpoint;
            let response = {};
            switch (endpoint) {
                case constants.ENDPOINTS.REGISTER:
                    response = await addUser(req);
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
async function addUser(req){
    const email = req.body["email"];
    const username = req.body["username"];
    const password = req.body["password"];

    let status = constants.STATUS_200;
    let response = {};

    if (!notEmpty([email, username, password])) {
        status = constants.STATUS_400;
        response = {"status": "error", "error": "One or more fields are empty."};
        return {status: status, response: response};
    }
    let userExists = await database.userExists(email, username);

    if (userExists) {
        status = constants.STATUS_400;
        response = {"status": "error", "error": "A user with that email or username already exists."};
        return {status: status, response: response};
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

    status = constants.STATUS_200;
    response = {"status": "OK"};
    return {status: status, response: response};
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
    if (ch) ch.close();
    if (conn) conn.close();
    server.close();
}
