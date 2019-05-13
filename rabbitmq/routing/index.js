/* library imports */
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const multer = require('multer');
const uuidv4 = require('uuid/v4');

/* internal imports */
const constants = require('./constants');
const rabbit = require('./rabbit');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8008;

/* redis */
const sessionOptions = {
    name: 'soc_login',
    secret: 'KYNxwY2ZeUXo8LKbsbZsMpccLbRewpBr',
    unset: 'destroy',
    resave: false,
    saveUninitialized: true,
    logErrors: true,
    store: new RedisStore(constants.REDIS_OPTIONS)
};
app.use(session(sessionOptions));

/* image upload destination */
const upload = multer();

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

function generateResponse(req, key, endpoint){
    let status = constants.STATUS_200;
    let response = new APIResponse();
    let data = {};
    if (key === constants.SERVICES.AUTH){
        return response;
    }
    else if (key === constants.SERVICES.EMAIL){
        return response;
    }
    else if (key === constants.SERVICES.MEDIA){
        return response;
    }
    else if (key === constants.SERVICES.QA){
        if (endpoint === constants.ENDPOINTS.QA_ADD_Q){
            let title = req.body.title;
            let body = req.body.body;
            let tags = req.body.tags;
            let media = (req.body.media == undefined) ? [] : media;
            let user = req.session.user;
            if (user == undefined || title == undefined || body == undefined || tags == undefined){
                if (user == undefined){
                    status = constants.STATUS_401;
                }
                else {
                    status = constants.STATUS_400;
                }   
                response.setERR(constants.ERR_MISSING_PARAMS);
    
                return {status: status, response: response.toOBJ(), queue: false};
            }

            status = constants.STATUS_200;
            response.setOK();
            data = {
                id: uuidv4()
            };
            let merged = {...response.toOBJ(), ...data};
            return {status: status, response: merged, queue: true};
        }
        else if (endpoint === constants.ENDPOINTS.QA_ADD_A){
            let qid = req.params.qid;
            let body = req.body.body;
            let media = req.body.media;
            let user = req.session.user;
            let username = (user == undefined) ? user : user._source.username;
            
            if (qid == undefined || body == undefined || user == undefined){
                if (user == undefined){
                    status = constants.STATUS_401;
                }
                else {
                    status = constants.STATUS_400;
                }
                response.setERR(constants.ERR_MISSING_PARAMS);
                return {status: status, response: response.toOBJ(), queue: false};
            }

            response = {
                id: uuidv4()
            };
            let merged = {...response.toOBJ(), ...data};
            return {status: status, response: merged, queue: true};
        }
    }
    else if (key === constants.SERVICES.REGISTER){
        return response;
    }
    else if (key === constants.SERVICES.SEARCH){
        return response;
    }
    else if (key === constants.SERVICES.USER){
        return response;
    }

    // should never be reached
    console.log(`[Router] what service is this? ${key}`);
    return response;
}

/**
 * Determines whether or not the router should wait for a response.
 * @param {Request} req Express Request object
 * @param {string} key routing key for the message (determines which service)
 * @param {string} endpoint which endpoint for the service
 */
function needToWait(req, key, endpoint){
    if (key === constants.SERVICES.AUTH){
        return true;
    }
    else if (key === constants.SERVICES.EMAIL){
        return true;
    }
    else if (key === constants.SERVICES.MEDIA){
        return true;
    }
    else if (key === constants.SERVICES.QA){
        if (req.session.user == undefined){
            return false;
        }
        if ((endpoint === constants.ENDPOINTS.QA_ADD_Q ||
            endpoint === constants.ENDPOINTS.QA_ADD_A) && 
            (req.body.media == undefined || 
                req.body.media.length == 0)){
            return false;
        }
        else if (endpoint === constants.ENDPOINTS.QA_DEL_Q){
            // with caching, check if the question is valid in cache
            //      then check if the poster matches the requester
        }
        else if (endpoint === constants.ENDPOINTS.QA_ACCEPT){
            // with caching, check if the answer is in cache
            //      check if the question is in cache
            //      check that there is no accepted answer yet
            //      check if the user matches the asker of the question
        }
        else if (endpoint === constants.ENDPOINTS.QA_UPVOTE_Q ||
                endpoint === constants.ENDPOINTS.QA_UPVOTE_A){
            // generate the response without asking the backend
            return false;
        }
        else if (endpoint === constants.ENDPOINTS.QA_GET_Q){
            // with caching, check if question is valid
        }
        else if (endpoint === constants.ENDPOINTS.QA_GET_A){
            // with caching, check if answer is valid
        }
        return true;
    }
    else if (key === constants.SERVICES.REGISTER){
        return true;
    }
    else if (key === constants.SERVICES.SEARCH){
        return true;
    }
    else if (key === constants.SERVICES.USER){
        return true;
    }

    // should never be reached
    console.log(`[Router] what service is this? ${key}`);
    return true;
}

/**
 * Routes an incoming request to a work/rpc queue.
 * Returns an object {'status': RMQ_STATUS, 'data': RMQ_DATA} where RMQ_DATA is data returned from the backend call.
 * If RMQ_STATUS == RMQ_SUCCESS, then 'data' will have the status code to set and the response object to return.
 * @param {string} routing_key routing key for the message
 * @param {string} type type of the message
 * @param {Object} msg message to publish
 */
async function routeRequest(key, type, msg){
    let publishRes = null;
    try {
        publishRes = await rabbit.publishMessage(key, type, msg);
    }
    catch (err){
        publishRes = err;
    }
    return publishRes;
}

/**
 * Wraps a request and routes it to a work/rpc queue.
 * @param {Request} req Express Request object
 * @param {Response} res Express response object
 * @param {string} key routing key for the message (determines which service)
 * @param {string} endpoint which endpoint for the service
 * 
 * Expects a response in the form of
 *      { status: int, data : obj }
 */
async function wrapRequest(req, res, key, endpoint){
    let data = {
        session: {user: ((req.session == undefined) ? undefined : req.session.user)},
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        params: req.params,
        body: req.body,
        file: req.file
    };
    if (endpoint === constants.ENDPOINTS.QA_ADD_Q && req.body.answers != undefined){
        data.body = {};
    }
    let should_wait = needToWait(req, key, endpoint);
    let rabbitRes = undefined;
    if (should_wait){
        rabbitRes = await routeRequest(key, endpoint, data);
    }
    else {
        rabbitRes = generateResponse(req, key, endpoint);
        if (rabbitRes.queue === true){
            if (endpoint === constants.ENDPOINTS.QA_ADD_Q ||
                endpoint === constants.ENDPOINTS.QA_ADD_A){
                data['id'] = rabbitRes.response.id;
            }
            // do NOT await here, just publish it
            routeRequest(key, endpoint, data);
        }
    }

    // console.log(`endpoint=${endpoint}, resp status=${rabbitRes.status}`);
    res.status(rabbitRes.status);

    // AUTH
    if (rabbitRes.user != undefined){
        req.session.user = rabbitRes.user;
    }
    if (endpoint == constants.ENDPOINTS.AUTH_LOGOUT && dbRes.status === constants.STATUS_200){
        req.session.destroy();
    }

    // MEDIA: nginx proxies directly to media now
    // if (dbRes.content_type != undefined){
    //     res.set('Content-Type', dbRes.content_type);
    //     if (endpoint == constants.ENDPOINTS.MEDIA_GET && dbRes.media != undefined && dbRes.media.type === "Buffer"){
    //         return res.send(Buffer.from(dbRes.media.data));
    //     }
    // }

    return res.json(rabbitRes.response);
}

/* auth service */
app.post('/login', async(req,res) => {
    let endpoint = constants.ENDPOINTS.AUTH_LOGIN;
    return await wrapRequest(req, res, constants.SERVICES.AUTH, endpoint);
});

app.post('/logout', async(req,res) => {
    let endpoint = constants.ENDPOINTS.AUTH_LOGOUT;
    return await wrapRequest(req, res, constants.SERVICES.AUTH, endpoint);
});

/* email service */
app.post('/verify', async(req,res) => {
    let endpoint = constants.ENDPOINTS.EMAIL_VERIFY;
    return await wrapRequest(req, res, constants.SERVICES.EMAIL, endpoint);
});

/* media service */
app.post('/addmedia', upload.single('content'), async (req,res) => {
    let endpoint = constants.ENDPOINTS.MEDIA_ADD;
    return await wrapRequest(req, res, constants.SERVICES.MEDIA, endpoint);
});

app.get('/media/:id', async(req,res) => {
    let endpoint = constants.ENDPOINTS.MEDIA_GET;
    return await wrapRequest(req, res, constants.SERVICES.MEDIA, endpoint);
});

/* qa service */
app.post('/questions/add', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_ADD_Q;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.get('/questions/:qid', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_GET_Q;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.post('/questions/:qid/answers/add', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_ADD_A;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.get('/questions/:qid/answers', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_GET_A;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.delete('/questions/:qid', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_DEL_Q;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.post('/questions/:qid/upvote', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_UPVOTE_Q;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.post('/answers/:aid/upvote', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_UPVOTE_A;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

app.post('/answers/:aid/accept', async(req, res) => {
    let endpoint = constants.ENDPOINTS.QA_ACCEPT;
    return await wrapRequest(req, res, constants.SERVICES.QA, endpoint);
});

/* registration service */
app.post('/adduser', async (req, res) => {
    let endpoint = constants.ENDPOINTS.REGISTER;
    return await wrapRequest(req, res, constants.SERVICES.REGISTER, endpoint);
});

/* search service */
app.post('/search', async (req, res) => {
    let endpoint = constants.ENDPOINTS.SEARCH;
    return await wrapRequest(req, res, constants.SERVICES.SEARCH, endpoint);
});

/* user service */
app.get('/user/:uid', async (req, res) => {
    let endpoint = constants.ENDPOINTS.USER_GET;
    return await wrapRequest(req, res, constants.SERVICES.USER, endpoint);
});

app.get('/user/:uid/questions', async (req, res) => {
    let endpoint = constants.ENDPOINTS.USER_Q;
    return await wrapRequest(req, res, constants.SERVICES.USER, endpoint);
});

app.get('/user/:uid/answers', async (req, res) => {
    let endpoint = constants.ENDPOINTS.USER_A;
    return await wrapRequest(req, res, constants.SERVICES.USER, endpoint);
});

/* Start the server. */
var server = app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
