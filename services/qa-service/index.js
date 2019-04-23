/* library imports */
const express = require('express');
const amqp = require('amqplib/callback_api');

/* internal imports */
const database = require('./database');
const constants = require('./constants');
const APIResponse = require('./apiresponse').APIResponse;

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8004;

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
  res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Credentials', 'true');
  next();
});

/* Start the server. */
var server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown(){
    if (ch) ch.close();
    if (conn) conn.close();
    database.shutdown();
    server.close();
}

/* amqplib connection */
var conn = null;
var ch = null;

/**
 * Asserts the Exchange and Queue exists and sets up the connection variables.
 */
function setupConnection(){
    console.log(`[Rabbit] Setting up connection...`);
    amqp.connect(constants.AMQP, function(error0, connection) {
        if (error0) {
            throw error0;
        }
        console.log(`[Rabbit] Connected...`);
        conn = connection;
        connection.createChannel(function(error1, channel) {
            if (error1) {
                throw error1;
            }
            console.log(`[Rabbit] Channel created...`);
            ch = channel;
            channel.assertExchange(constants.EXCHANGE.NAME, constants.EXCHANGE.TYPE, constants.EXCHANGE.PROPERTIES, (error2, ex) => {
                if (error2){
                    throw error2;
                }
                console.log(`[Rabbit] Asserted exchange... ${ex.exchange}`);
                ch.assertQueue(constants.SERVICES.QA, constants.QUEUE.PROPERTIES, function(error3, q){
                    if (error3){
                        throw error3;
                    }
                    console.log(`[Rabbit] Asserted queue... ${q.queue}`);
                    ch.bindQueue(q.queue, ex.exchange, constants.SERVICES.QA);
                    console.log(`[Rabbit] Binded ${q.queue} with key ${constants.SERVICES.QA} to ${ex.exchange}...`);
                    ch.prefetch(1); 
                    console.log(`[Rabbit] Set prefetch 1...`);
                    ch.consume(q.queue, processRequest);
                    console.log(`[Rabbit] Attached processRequest callback to ${q.queue}...`);
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
    console.log(`Received ${msg.content.toString()}`);
    let req = JSON.parse(msg.content.toString()); // gives back the data object
    let endpoint = req.endpoint;
    let response = {};
    switch (endpoint) {
        case constants.ENDPOINTS.QA_ADD_Q:
            response = await addQuestion(req);
            break;
        case constants.ENDPOINTS.QA_GET_Q:
            response = await getQuestion(req);
            break;
        case constants.ENDPOINTS.QA_ADD_A:
            response = await addAnswer(req);
            break;
        case constants.ENDPOINTS.QA_GET_A:
            response = await getAnswers(req);
            break;
        case constants.ENDPOINTS.QA_DEL_Q:
            response = await deleteQuestion(req);
            break;
        case constants.ENDPOINTS.QA_UPVOTE_Q:
            response = await upvoteQuestion(req);
            break;
        case constants.ENDPOINTS.QA_UPVOTE_A:
            response = await upvoteAnswer(req);
            break;
        case constants.ENDPOINTS.QA_ACCEPT:
            response = await acceptAnswer(req);
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
    }
    catch (err) {
        console.log(`[Rabbit] Failed to setup connection, ${err}`);
    }
}

main();

/* ------------------ ENDPOINTS ------------------ */

/* milestone 1 */

async function addQuestion(req){
    let status = constants.STATUS_200;
    let response = new APIResponse();
    let data = {};

    // grab parameters
    let title = req.body.title;
    let body = req.body.body;
    let tags = req.body.tags;
    let media = req.body.media;
    let user = req.session.user;

    // check if any mandatory parameters are undefined
    if (user == undefined || title == undefined || body == undefined || tags == undefined){
        if (user == undefined){
            status = constants.STATUS_401;
        }
        else {
            status = constants.STATUS_400;
        }   
        response.setERR(constants.ERR_MISSING_PARAMS);
        return {status: status, response: response.toOBJ()};
    }

    // perform database operations
    let addRes = await database.addQuestion(user, title, body, tags, media);
    
    // check response result
    if (addRes.status === constants.DB_RES_ERROR){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_GENERAL);
    }
    else if (addRes.status === constants.DB_RES_MEDIA_IN_USE){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_MEDIA_IN_USE);
    }
    else if (addRes.status === constants.DB_RES_SUCCESS){
        status = constants.STATUS_200;
        response.setOK();
        data[constants.ID_KEY] = addRes.data;
    }
    let merged = {...response.toOBJ(), ...data};
    return {status: status, response: merged};
}

async function getQuestion(req){
    let status = constants.STATUS_200;
    let response = new APIResponse();
    let data = {};

    // grab parameters
    let qid = req.params.qid;
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;

    // on getting the IP
    // https://stackoverflow.com/questions/10849687/express-js-how-to-get-remote-client-address
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // check if any mandatory parameters are undefined
    if (qid == undefined){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_MISSING_PARAMS);
        return {status: status, response: response.toOBJ()};
    }

    // perform database operations
    let getRes = await database.getQuestion(qid, username, ip, true);
    
    // check response result
    if (getRes.status === constants.DB_RES_Q_NOTFOUND){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (getRes.status === constants.DB_RES_SUCCESS){
        status = constants.STATUS_200;
        response.setOK();
        let question = getRes.data;
        question._source['id'] = question._id;
        question._source['media'] = (question._source['media'].length == 0) ? null : question._source['media'];
        data[constants.QUESTION_KEY] = question._source;
    }
    let merged = {...response.toOBJ(), ...data};
    return {status: status, response: merged};
}

async function addAnswer(req){
    let status = constants.STATUS_200;
    let response = new APIResponse();
    let data = {};

    // grab parameters
    let qid = req.params.qid;
    let body = req.body.body;
    let media = req.body.media;
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;

    // check if any mandatory parameters are undefined
    if (qid == undefined || body == undefined || user == undefined){
        if (user == undefined){
            status = constants.STATUS_401;
        }
        else {
            status = constants.STATUS_400;
        }
        response.setERR(constants.ERR_MISSING_PARAMS);
        return {status: status, response: response.toOBJ()};
    }

    // perform database operations
    let addRes = await database.addAnswer(qid, username, body, media);
    
    // check response result
    if (addRes.status === constants.DB_RES_Q_NOTFOUND){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (addRes.status === constants.DB_RES_ERROR){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_GENERAL);
    }
    else if (addRes.status === constants.DB_RES_SUCCESS){
        status = constants.STATUS_200;
        response.setOK();
        data[constants.ID_KEY] = addRes.data;
    }
    let merged = {...response.toOBJ(), ...data};
    return {status: status, response: merged};
}

async function getAnswers(req){
    let status = constants.STATUS_200;
    let response = new APIResponse();
    let data = {};

    // grab parameters
    let qid = req.params.qid;

    // check if any mandatory parameters are undefined
    if (qid == undefined){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_MISSING_PARAMS);
        return {status: status, response: response.toOBJ()};
    }

    // perform database operations
    let getRes = await database.getAnswers(qid);
    let answers = getRes.data;
    let transformedAnswers = [];
    
    // check response result
    if (getRes.status === constants.DB_RES_Q_NOTFOUND){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (getRes.status === constants.DB_RES_SUCCESS){
        status = constants.STATUS_200;
        response.setOK();

        // transform them to fit the external model
        for (var ans of answers){
            ans._source[constants.ID_KEY] = ans._id;
            ans = ans._source;
            ans.media = (ans.media.length == 0) ? null : ans.media;
            delete ans.qid;
            transformedAnswers.push(ans);
        }
        data[constants.ANSWERS_KEY] = transformedAnswers;
    }
    let merged = {...response.toOBJ(), ...data};
    return {status: status, response: merged};
}

/* milestone 2 */

async function deleteQuestion(req){
    // grab parameters
    let status = constants.STATUS_200;
    let response = new APIResponse();

    // grab parameters
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;
    let qid = req.params.qid;
    
    // check if any mandatory parameters are undefined
    if (user == undefined || qid == undefined){
        if (user == undefined){
            status = constants.STATUS_401;
        }
        else {
            status = constants.STATUS_400;
        }
        response.setERR(constants.ERR_MISSING_PARAMS);
        return {status: status, response: response.toOBJ()};
    }

    // perform database operations
    let deleteRes = await database.deleteQuestion(qid,username);
    
    // check response result
    if (deleteRes.status === constants.DB_RES_NOT_ALLOWED){
        status = constants.STATUS_403;
        response.setERR(constants.ERR_DEL_NOTOWN_Q);
    }
    else if (deleteRes.status === constants.DB_RES_Q_NOTFOUND){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (deleteRes.status === constants.DB_RES_SUCCESS){
        status = constants.STATUS_200;
        response.setOK();
    }
    return {status: status, response: response.toOBJ()};
}

/* milestone 3 */

async function upvoteQuestion(req){
    let status = constants.STATUS_200;
    let response = new APIResponse();

    // grab parameters
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;
    let qid = req.params.qid;
    let upvote = (req.body.upvote == undefined) ? true : req.body.upvote;

    // check if any mandatory parameters are unspecified
    if (user == undefined || qid == undefined || upvote == undefined){
        if (user == undefined){
            status = constants.STATUS_401;
        }
        else {
            status = constants.STATUS_400;
        }
        response.setERR(constants.ERR_MISSING_PARAMS);
        return {status: status, response: response.toOBJ()};
    }

    // perform database operations
    let updateRes = await database.upvoteQuestion(qid, username, upvote);
    
    // check response result
    if (updateRes.status === constants.DB_RES_Q_NOTFOUND){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (updateRes.status === constants.DB_RES_ERROR){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_GENERAL);
    }
    else if (updateRes.status === constants.DB_RES_SUCCESS){
        status = constants.STATUS_200;
        response.setOK();
    }

    // return HTTP response
    return {status: status, response: response.toOBJ()};
}

async function upvoteAnswer(req){
    let status = constants.STATUS_200;
    let response = new APIResponse();
    
    // grab parameters
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;
    let aid = req.params.aid;
    let upvote = (req.body.upvote == undefined) ? true : req.body.upvote;

    // check if any mandatory parameters are unspecified
    if (user == undefined || aid == undefined || upvote == undefined){
        if (user == undefined){
            status = constants.STATUS_401;
        }
        else {
            status = constants.STATUS_400;
        }
        response.setERR(constants.ERR_MISSING_PARAMS);
        return {status: status, response: response.toOBJ()};
    }

    // perform database operations
    let updateRes = await database.upvoteAnswer(aid, username, upvote);

    // check response result
    if (updateRes.status === constants.DB_RES_A_NOTFOUND){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_A_NOTFOUND);
    }
    else if (updateRes.status === constants.DB_RES_ERROR){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_GENERAL);
    }
    else if (updateRes.status === constants.DB_RES_SUCCESS){
        status = constants.STATUS_200;
        response.setOK();
    }

    // return HTTP response
    return {status: status, response: response.toOBJ()};
}

async function acceptAnswer(req){
    let status = constants.STATUS_200;
    let response = new APIResponse();
    
    // grab parameters
    let user = req.session.user;
    let username = (user == undefined) ? user : user._source.username;
    let aid = req.params.aid;

    // check if any mandatory parameters are unspecified
    if (user == undefined || aid == undefined){
        if (user == undefined){
            status = constants.STATUS_401;
        }
        else {
            status = constants.STATUS_400;
        }
        response.setERR(constants.ERR_MISSING_PARAMS);
        return {status: status, response: response.toOBJ()};
    }

    // perform database operations
    let acceptRes = await database.acceptAnswer(aid, username);

    // check response result
    if (acceptRes.status === constants.DB_RES_Q_NOTFOUND){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_Q_NOTFOUND);
    }
    else if (acceptRes.status === constants.DB_RES_A_NOTFOUND){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_A_NOTFOUND);
    }
    else if (acceptRes.status === constants.DB_RES_NOT_ALLOWED){
        status = constants.STATUS_403;
        response.setERR(constants.ERR_NOT_ALLOWED);
    }
    else if (acceptRes.status === constants.DB_RES_ALRDY_ACCEPTED){
        status = constants.STATUS_400;
        response.setERR(constants.ERR_ALRDY_ACCEPTED);
    }
    else if (acceptRes.status === constants.DB_RES_SUCCESS){
        status = constants.STATUS_200;
        response.setOK();
    }

    // return HTTP response
    return {status: status, response: response.toOBJ()};
}
