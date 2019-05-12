/* library imports */
const express = require('express');
const rabbot = require('rabbot');

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
    database.shutdown();
    server.close();
}

rabbot.nackOnError();

/* install handlers */
rabbot.handle({
    queue: constants.SERVICES.QA,
    type: constants.ENDPOINTS.QA_ADD_Q,
    autoNack: false,
    handler: addQuestion
});

rabbot.handle({
    queue: constants.SERVICES.QA,
    type: constants.ENDPOINTS.QA_GET_Q,
    autoNack: false,
    handler: getQuestion
});

rabbot.handle({
    queue: constants.SERVICES.QA,
    type: constants.ENDPOINTS.QA_ADD_A,
    autoNack: false,
    handler: addAnswer
});

rabbot.handle({
    queue: constants.SERVICES.QA,
    type: constants.ENDPOINTS.QA_GET_A,
    autoNack: false,
    handler: getAnswers
});

rabbot.handle({
    queue: constants.SERVICES.QA,
    type: constants.ENDPOINTS.QA_DEL_Q,
    autoNack: false,
    handler: deleteQuestion
});

rabbot.handle({
    queue: constants.SERVICES.QA,
    type: constants.ENDPOINTS.QA_UPVOTE_Q,
    autoNack: false,
    handler: upvoteQuestion
});

rabbot.handle({
    queue: constants.SERVICES.QA,
    type: constants.ENDPOINTS.QA_UPVOTE_A,
    autoNack: false,
    handler: upvoteAnswer
});

rabbot.handle({
    queue: constants.SERVICES.QA,
    type: constants.ENDPOINTS.QA_ACCEPT,
    autoNack: false,
    handler: acceptAnswer
});

/* configure rabbot */
rabbot.configure(constants.RABBOT_SETTINGS)
    .then(function(){
        console.log('[Rabbot-Router] Rabbot configured...');
    }).catch(err => {
        console.log(`[Rabbot-Router] err ${err}`);
    });

/* ------------------ ENDPOINTS ------------------ */

/* milestone 1 */
async function addQuestion(req){
    try {
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
            req.reply({status: status, response: response.toOBJ()});
            req.ack();
            return;
        }

        // perform database operations
        let addRes = await database.addQuestion(user, title, body, tags, media);
        
        // check response result
        if (addRes.status === constants.DB_RES_ERROR){
            status = constants.STATUS_400;
            response.setERR(constants.ERR_GENERAL);
        }
        else if (addRes.status === constants.DB_RES_MEDIA_INVALID){
            status = constants.STATUS_400;
            response.setERR(constants.ERR_MEDIA_INVALID);
        }
        else if (addRes.status === constants.DB_RES_SUCCESS){
            status = constants.STATUS_200;
            response.setOK();
            data[constants.ID_KEY] = addRes.data;
        }
        let merged = {...response.toOBJ(), ...data};

        // reply
        req.reply({status: status, response: merged});
        req.ack();
    } catch (err){
        console.log(`[QA] addQuestion err ${JSON.stringify(err)}`);
        req.nack();
    }
}

async function getQuestion(req){
    try {
        let status = constants.STATUS_200;
        let response = new APIResponse();
        let data = {};

        // grab parameters
        let qid = req.params.qid;
        let user = req.session.user;
        let username = (user == undefined) ? user : user._source.username;

        // on getting the IP
        // https://stackoverflow.com/questions/10849687/express-js-how-to-get-remote-client-address
        // let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        let ip = req.ip; // passed in from rabbit-router

        // check if any mandatory parameters are undefined
        if (qid == undefined){
            status = constants.STATUS_400;
            response.setERR(constants.ERR_MISSING_PARAMS);
            req.reply({status: status, response: response.toOBJ()});
            req.ack();
            return;
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
        req.reply({status: status, response: merged});
        req.ack();
    } catch (err){
        console.log(`[QA] getQuestion err ${JSON.stringify(err)}`);
        req.nack();
    }
}

async function addAnswer(req){
    try {
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
            req.reply({status: status, response: response.toOBJ()});
            req.ack();
            return;
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
        req.reply({status: status, response: merged});
        req.ack();
    } catch (err){
        console.log(`[QA] addAnswer err ${JSON.stringify(err)}`);
        req.nack();
    }
}

async function getAnswers(req){
    try {
        let status = constants.STATUS_200;
        let response = new APIResponse();
        let data = {};

        // grab parameters
        let qid = req.params.qid;

        // check if any mandatory parameters are undefined
        if (qid == undefined){
            status = constants.STATUS_400;
            response.setERR(constants.ERR_MISSING_PARAMS);
            req.reply({status: status, response: response.toOBJ()});
            req.ack();
            return;
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
        req.reply({status: status, response: merged});
        req.ack();
    } catch (err){
        console.log(`[QA] getAnswers err ${JSON.stringify(err)}`);
        req.nack();
    }
}

/* milestone 2 */

async function deleteQuestion(req){
    try {
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
            req.reply({status: status, response: response.toOBJ()});
            req.ack();
            return;
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
        req.reply({status: status, response: response.toOBJ()});
        req.ack();
    } catch(err){
        console.log(`[QA] deleteQuestion err ${JSON.stringify(err)}`);
        req.nack();
    }
}

/* milestone 3 */

async function upvoteQuestion(req){
    try {
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
            req.reply({status: status, response: response.toOBJ()});
            req.ack();
            return;
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
        req.reply({status: status, response: response.toOBJ()});
        req.ack();
    } catch (err){
        console.log(`[QA] upvoteQuestion err ${JSON.stringify(err)}`);
        req.nack();
    }
}

async function upvoteAnswer(req){
    try {
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
            req.reply({status: status, response: response.toOBJ()});
            req.ack();
            return;
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
        req.reply({status: status, response: response.toOBJ()});
        req.ack();
    } catch (err){
        console.log(`[QA] upvoteAnswer err ${JSON.stringify(err)}`);
        req.nack();
    }
}

async function acceptAnswer(req){
    try {
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
            req.reply({status: status, response: response.toOBJ()});
            req.ack();
            return;
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
        req.reply({status: status, response: response.toOBJ()});
        req.ack();
    } catch (err){
        console.log(`[QA] acceptAnswer err ${JSON.stringify(err)}`);
        req.nack();
    }
}
