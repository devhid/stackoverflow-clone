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
const PORT = 8007;

/* enable CORS */
app.use(function(req, res, next) {
    res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Credentials', 'true');
    next();
});

/* parse incoming requests data as json */
app.use(express.json());

/* amqplib connection */
var conn = null;
var ch = null;

/**
 * Asserts the Exchange and Queue exists and sets up the connection variables.
 */
function setupConnection(){
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
                ch.assertQueue(constants.SERVICES.MEDIA, constants.QUEUE.PROPERTIES, function(error2, q){
                    if (error2){
                        throw error2;
                    }
                    ch.bindQueue(q.queue, constants.EXCHANGE.NAME, constants.SERVICES.MEDIA);
                    ch.prefetch(1); 
                    ch.consume(q.queue, processRequest(msg));
                });
            });
        });
    });
}

/**
 * Processes the request contained in the message and replies to the specified queue.
 * @param {Object} msg the message on the RabbitMQ queue
 */
async function processRequest(msg){
    let data = JSON.parse(msg.content.toString()); // gives back the data object
    let endpoint = data.endpoint;
    let response = {};
    switch (endpoint) {
        case constants.ENDPOINTS.MEDIA_ADD:
            response = await addMedia(data);
            break;
        case constants.ENDPOINTS.MEDIA_GET:
            response = await getMedia(data);
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

/*app.post('/addmedia', upload.single('content'), async (req, res) => {
    let response = generateERR();
    let user = req.session.user;

    if (user === undefined) {
        res.status(constants.STATUS_401);
        response[constants.STATUS_ERR] = constants.ERR_NOT_LOGGED_IN;
        return res.json(response);
    }

    if (req.file === undefined) {
        res.status(constants.STATUS_400);
        response[constants.STATUS_ERR] = constants.ERR_MISSING_FILE;
        return res.json(response);
    }

    const filename = req.file.originalname;
    const content = req.file.buffer;
    const mimetype = req.file.mimetype;

    // get generated id from uploading media
    let mediaId = null;
    try {
        mediaId = await database.uploadMedia(filename, content, mimetype);
    } catch(err) {
        response[constants.STATUS_ERR] = err;
        return res.json(response);
    }

    res.status(constants.STATUS_200);
    response = generateOK();
    response[constants.ID_KEY] = mediaId;
    return res.json(response);
});*/

async function addMedia(req) {
    let response = {};
    let user = req.session.user;

    if (user === undefined) {
        response = generateERR(constants.STATUS_401, constants.ERR_NOT_LOGGED_IN);
        return response;
    }

    if (req.file === undefined) {
        response = generateERR(constants.STATUS_400, constants.ERR_MISSING_FILE);
        return response;
    }

    const filename = req.file.originalname;
    const content = req.file.buffer;
    const mimetype = req.file.mimetype;

    // get generated id from uploading media
    let mediaId = null;
    try {
        mediaId = await database.uploadMedia(filename, content, mimetype);
    } catch(err) {
        response = generateERR(constants.STATUS_400, err);
        return response;
    }

    response = generateOK();
    response[constants.ID_KEY] = mediaId;
    return response;
}

/*app.get('/media/:id', async (req, res) => {
    let response = generateERR();

    const mediaId = req.params['id'];
    let image = null;

    try {
        image = await database.getMedia(mediaId);
    } catch(err) {
        res.status(constants.STATUS_400);
        response[constants.STATUS_ERR] = err;
        return res.json(response);
    }

    res.status(constants.STATUS_200);
    res.set({ 'Content-Type': image.mimetype });
    return res.send(image.content);
});*/

async function getMedia(req) {
    let response = {};

    const mediaId = req.params['id'];
    let image = null;

    try {
        image = await database.getMedia(mediaId);
    } catch(err) {
        response = generateERR(constants.STATUS_400, err);
        return response;
    }

    response = generateOK();
    response['content_type'] = image.mimetype;
    return res.send(image.content);
}

/* helper funcs */
function generateOK(){
    let response = {
        status: constants.STATUS_200,
        response: {
            status: constants.STATUS_OK
        }
    };
    return response;
}

function generateERR(status, err){
    let response = {
        status: status,
        response: {
            status: constants.STATUS_ERR,
            error: err,
        }
    }
    return response;
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