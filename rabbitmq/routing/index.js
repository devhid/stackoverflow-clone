/* library imports */
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const multer = require('multer');
const uuidv4 = require('uuid/v4');
const Memcached = require('memcached');

/* internal imports */
const constants = require('./constants');
const rabbit = require('./rabbit');
const APIResponse = require('./apiresponse').APIResponse;

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

/* memcached */
const memcached = new Memcached(constants.MEMCACHED_LOCATIONS);

/* multer */
const upload = multer();

/* parse incoming requests data as json */
app.use(express.json());

/* enable CORS */
app.use(function(req, res, next) {
  //res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.set('Access-Control-Allow-Origin', 'http://kellogs.cse356.compas.cs.stonybrook.edu');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Credentials', 'true');
  next();
});

function missingElement(arr){
    for (var element of arr){
        if (element == undefined){
            return true;
        }
    }
    return false;
}

function setCachedObject(key, value){
    return new Promise((resolve, reject) => {
        memcached.set(key, value, 10, (err) => {
            if(err) {
                resolve(err);
            } else {
                resolve(null);
            }
        });
    });
}

function getCachedObject(key) {
    return new Promise((resolve, reject) => {
        memcached.get(key, (err, data) => {
            if(err) {
                resolve(null);
            } else {
                resolve(data);
            }
        });
    });
}

function removeCachedObject(key){
    return new Promise((resolve, reject) => {
        memcached.del(key, (err) => {
            if(err) {
                resolve(err);
            } else {
                resolve(null);
            }
        });
    });
}

function touchCachedObject(key){
    return new Promise((resolve, reject) => {
        memcached.touch(key, 10, (err) => {
            if(err) {
                resolve(err);
            } else {
                resolve(null);
            }
        });
    });
}

async function generateResponse(key, endpoint, req, obj){
    let status = undefined;
    let response = new APIResponse();
    let data = {};
    if (key === constants.SERVICES.AUTH){
        return undefined;
    }
    else if (key === constants.SERVICES.EMAIL){
        let verified = await getCachedObject("verify:" + req.body.email);
        let needToQueue = true;
        if (verified != null){
            status = constants.STATUS_400;
            response.setERR("Email is already verified.");
            needToQueue = false;
        }

        let register = obj;
        if (req.body.key === constants.VERIFY_BACKDOOR){
            status = constants.STATUS_200;
            response.setOK();
            needToQueue = true;
        }
        return {status: status, response: response, queue: needToQueue};
    }
    else if (key === constants.SERVICES.MEDIA){
        if (endpoint === constants.ENDPOINTS.MEDIA_ADD){    
            status = constants.STATUS_200;
            response.setOK();
            data = {
                id: uuidv4()
            };
            let merged = {...response.toOBJ(), ...data};
            return {status: status, response: merged, queue: true};
        }
        return undefined;
    }
    else if (key === constants.SERVICES.QA){
        if (endpoint === constants.ENDPOINTS.QA_ADD_Q ||
            endpoint === constants.ENDPOINTS.QA_ADD_A){

            let missingParams = false;
            let user = req.session.user;

            if (endpoint === constants.ENDPOINTS.QA_ADD_Q){
                let title = req.body.title;
                let body = req.body.body;
                let tags = req.body.tags;
                missingParams = missingElement([user, title, body, tags]);
            }
            else {
                let qid = req.params.qid;
                let body = req.body.body;
                missingParams = missingElement([user, qid, body]);
            }

            if (missingParams === true){
                if (user == undefined){
                    status = constants.STATUS_401;
                }
                else {
                    status = constants.STATUS_400;
                }
                response.setERR(constants.ERR_MISSING_PARAMS);
                return {status: status, response: response.toOBJ(), queue: false};
            }
            // the only time we can send a response back with media is if we have seen
            //  at least one of the specified media IDs is in use
            if (req.body.media != undefined && req.body.media.length > 0){
                let media_invalid = false;
                let media = (req.body.media == undefined) ? [] : req.body.media;
                // check if any media are in use
                for (var media_id of media){
                    let media_in_use = await getCachedObject("media:" + media_id);
                    if (media_in_use != null){
                        media_invalid = true;
                        break;
                    }
                    let media_poster = await getCachedObject("media_poster:" + media_id);
                    if (media_poster == null || media_poster !== req.session.user._source.username){
                        media_invalid = true;
                        break;
                    }
                }
                if (media_invalid === true){
                    status = constants.STATUS_400;
                    response.setERR(constants.ERR_MEDIA_INVALID);
                    return {status: status, response: response.toOBJ(), queue: false};
                }  
            }

            status = constants.STATUS_200;
            response.setOK();
            data = {
                id: uuidv4()
            };
            let merged = {...response.toOBJ(), ...data};
            let timestamp = Date.now()/1000
            return {status: status, response: merged, timestamp: timestamp, queue: true};
        }
        else if (endpoint === constants.ENDPOINTS.QA_DEL_Q){
            let user = req.session.user;
            let qid = req.params.qid;
            let missingParams = missingElement([user,qid]);
            if (missingParams === true){
                if (user == undefined){
                    status = constants.STATUS_401;
                }
                else {
                    status = constants.STATUS_400;
                }
                response.setERR(constants.ERR_MISSING_PARAMS);
                return {status: status, response: response.toOBJ(), queue: false};
            }
            let question_resp = obj;
            let question = question_resp.response.question;
            if (question != null){
                // check if the poster matches the requester
                if (question.user.username === user._source.username){
                    // delete cached records of used media
                    if (question.media != null){
                        for (var media_id of question.media){
                            await removeCachedObject("media:" + media_id);
                        }
                    }
                    
                    // mark the question as deleted in cache
                    // removeCachedObject("source:" + qid);
                    let delQuestionResp = new APIResponse();
                    delQuestionResp.setERR(constants.ERR_Q_NOTFOUND);
                    let newCachedResp = {status: constants.STATUS_400, response: delQuestionResp.toOBJ()};
                    await setCachedObject("get:" + qid, newCachedResp);

                    // send the response
                    status = constants.STATUS_200;
                    response.setOK();
                    return {status: status, response: response.toOBJ(), queue: true};
                }
                else {
                    status = constants.STATUS_403;
                    response.setERR(constants.ERR_DEL_NOTOWN_Q);
                    return {status: status, response: response.toOBJ(), queue: false};
                }
            }
            return question_resp;
        }
        else if (endpoint === constants.ENDPOINTS.QA_ACCEPT){
            let user = req.session.user;
            let aid = req.params.aid;
            let missingParams = missingElement([user, aid]);
            if (missingParams === true){
                if (user == undefined){
                    status = constants.STATUS_401;
                }
                else {
                    status = constants.STATUS_400;
                }
                response.setERR(constants.ERR_MISSING_PARAMS);
                return {status: status, response: response.toOBJ(), queue: false};
            }
            let question_resp = obj;
            let question = question_resp.response.question;
            if (question != null){
                // check that there is no accepted answer and the user matches
                if (question.accepted_answer_id == null && 
                    question.user.username === user._source.username){
                    
                    // update cached question
                    let newQuestionSource = question;
                    newQuestionSource.accepted_answer_id = aid;
                    // setCachedObject("source:" + question.id);
                    let acceptQuestionResp = new APIResponse();
                    acceptQuestionResp.setOK();
                    let merged = {...response.toOBJ(), ...newQuestionSource};
                    let newCachedResp = {status: constants.STATUS_200, response: merged};
                    await setCachedObject("get:" + question.id, newCachedResp);

                    // update cached answer
                    let answer_resp = await getCachedObject("get:" + aid);
                    if (answer_resp != null){
                        let answer = answer_resp.response.answers;
                        let newAnswerSource = answer;
                        newAnswerSource.is_accepted = true;
                        // setCachedObject("source:" + aid);
                        acceptQuestionResp = new APIResponse();
                        acceptQuestionResp.setOK();
                        merged = {...response.toOBJ(), ...newAnswerSource};
                        newCachedResp = {status: constants.STATUS_200, response: merged};
                        await setCachedObject("get:" + aid, newCachedResp);
                    }
                    
                    status = constants.STATUS_200;
                    response.setOK();
                    return {status: status, response: response.toOBJ(), queue: true};
                }
                else {
                    if (question.accepted_answer_id != null){
                        status = constants.STATUS_400;
                        response.setERR(constants.ERR_ALRDY_ACCEPTED);
                    }
                    else if (question.user.username !== user._source.username){
                        status = constants.STATUS_403;
                        response.setERR(constants.ERR_NOT_ALLOWED);
                    }
                    return {status: status, response: response.toOBJ(), queue: false};
                }
            }
            return undefined;
        }
        else if (endpoint === constants.ENDPOINTS.QA_UPVOTE_Q ||
                endpoint === constants.ENDPOINTS.QA_UPVOTE_A){
            let user = req.session.user;
            let which_id = (endpoint === constants.ENDPOINTS.QA_UPVOTE_Q) ? req.params.qid : req.params.aid;
            let upvote = (req.body.upvote == undefined) ? true : req.body.upvote;
            let missingParams = missingElement([user, which_id, upvote]);
            if (missingParams === true){
                if (user == undefined){
                    status = constants.STATUS_401;
                }
                else {
                    status = constants.STATUS_400;
                }
                response.setERR(constants.ERR_MISSING_PARAMS);
                return {status: status, response: response.toOBJ(), queue: false};
            }

            // invalidate the cached question/answer
            // removeCachedObject("source:" + which_id);
            if (endpoint === constants.ENDPOINTS.QA_UPVOTE_Q){
                removeCachedObject("get:" + which_id);
            }
            
            status = constants.STATUS_200;
            response.setOK();
            return {status: status, response: response.toOBJ(), queue: true};
        }
        else if (endpoint === constants.ENDPOINTS.QA_GET_Q){
            let qid = req.params.qid;
            let missingParams = missingElement([qid]);
            if (missingParams === true){
                status = constants.STATUS_400;
                response.setERR(constants.ERR_MISSING_PARAMS);
                return {status: status, response: response.toOBJ(), queue: false};
            }
            let question_resp = obj;
            let question = question_resp.response.question;
            let question_views = question_resp.views;
            // let question_views = await getCachedObject("views:" + qid);
            // let question_resp = await getCachedObject("get:" + qid);
            
            // check if we need to update question view_count
            let user = (req.session != undefined) ? req.session.user : undefined;
            let username = (user != undefined) ? user._source.username : undefined;
            let ip = req.ip;
            let viewed = false;
            if (username != undefined){
                let users = question_views.authenticated;
                if (users.includes(username)){
                    viewed = true;
                }
                else {
                    question_views.authenticated.push(username);
                }
            }
            else {
                let ips = question_views.unauthenticated;
                if (ips.includes(ip)){
                    viewed = true;
                }
                else {
                    question_views.unauthenticated.push(ip);
                }
            }
            if (viewed === false){
                question.view_count += 1;
                await setCachedObject("get:" + qid, question_resp);
            }
            question_resp['queue'] = true;
            return question_resp;
        }
        else if (endpoint === constants.ENDPOINTS.QA_GET_A){
            let qid = req.params.qid;
            let missingParams = missingElement([qid]);
            if (missingParams === true){
                status = constants.STATUS_400;
                response.setERR(constants.ERR_MISSING_PARAMS);
                return {status: status, response: response.toOBJ(), queue: false};
            }
            let get_answers_resp = obj;
            get_answers_resp['queue'] = false;
            return get_answers_resp;
        }
    }
    else if (key === constants.SERVICES.REGISTER){
        response.setERR("A user with that email or username already exists.");
        status = constants.STATUS_409;
        return {status: status, response: response.toOBJ(), queue: false};
    }
    else if (key === constants.SERVICES.SEARCH){
        return undefined;
    }
    else if (key === constants.SERVICES.USER){
        let response = obj;
        response['queue'] = false;
        return response;
    }

    // should never be reached
    console.log(`[Router] generateResponse what service is this? ${key}`);
    return undefined;
}

async function getRelevantObj(key, endpoint, req){
    if (key === constants.SERVICES.AUTH){
        return null;
    }
    else if (key === constants.SERVICES.EMAIL){
        if (req.body.email == undefined){
            return null;
        }
        await touchCachedObject("register:" + req.body.email);
        return await getCachedObject("register:" + req.body.email);
    }
    else if (key === constants.SERVICES.MEDIA){
        return null;
    }
    else if (key === constants.SERVICES.QA){
        if (endpoint === constants.ENDPOINTS.QA_ADD_Q ||
            endpoint === constants.ENDPOINTS.QA_ADD_A){
            return null;
        }
        else if (endpoint === constants.ENDPOINTS.QA_DEL_Q){
            // return the question
            if (req.params.qid == undefined){
                return null;
            }
            await touchCachedObject("get:" + req.params.qid);
            return await getCachedObject("get:" + req.params.qid);
        }
        else if (endpoint === constants.ENDPOINTS.QA_ACCEPT){
            // return the question for the answer
            if (req.params.aid == undefined){
                return null;
            }
            await touchCachedObject("get:" + req.params.aid);
            let answer = await getCachedObject("get:" + req.params.aid);
            if (answer == null){
                return null;
            }
            await touchCachedObject("get:" + answer._source.qid);
            return await getCachedObject("get:" + answer._source.qid);
        }
        else if (endpoint === constants.ENDPOINTS.QA_UPVOTE_Q ||
                endpoint === constants.ENDPOINTS.QA_UPVOTE_A){
            return null;
        }
        else if (endpoint === constants.ENDPOINTS.QA_GET_Q){
            // return the question/answer
            let qid = req.params.qid;
            if (qid == undefined){
                return null;
            }
            // let question_views = getCachedObject("views:" + qid);
            // if (question_views == null){
            //     return null;
            // }
            await touchCachedObject("get:" + qid);
            let question_resp = await getCachedObject("get:" + qid);
            if (question_resp == null || question_resp.views == null){
                return null;
            }
            return question_resp;
        }
        else if (endpoint === constants.ENDPOINTS.QA_GET_A){
            let qid = req.params.qid;
            if (qid == undefined){
                return null;
            }
            await touchCachedObject("question_answers:" + qid);
            return await getCachedObject("question_answers:" + qid);
        }
    }
    else if (key === constants.SERVICES.REGISTER){
        return null;
    }
    else if (key === constants.SERVICES.SEARCH){
        return null;
    }
    else if (key === constants.SERVICES.USER){
        if (endpoint === constants.ENDPOINTS.USER_GET){
            return await getCachedObject("user_profile:" + req.params.username);
        }
        else if (endpoint === constants.ENDPOINTS.USER_Q){
            return await getCachedObject("user_questions:" + req.params.username);
        }
        else if (endpoint === constants.ENDPOINTS.USER_A){
            return await getCachedObject("user_answers:" + req.params.username);
        }
    }

    // should never be reached
    console.log(`[Router] getRelevantObj what service is this? ${key}`);
    return undefined;
}

async function updateRelevantObj(key, endpoint, req, rabbitRes){
    if (rabbitRes.status === constants.STATUS_200){
        if (key === constants.SERVICES.AUTH){
            return;
        }
        else if (key === constants.SERVICES.EMAIL){
            let username = await getCachedObject("register:" + req.body.email);
            if (username != null){
                await setCachedObject("verify:" + username, 1);
                await removeCachedObject("register:" + req.body.email);
            }
            return;
        }
        else if (key === constants.SERVICES.MEDIA){
            if (endpoint === constants.ENDPOINTS.MEDIA_ADD){
                let media_id = rabbitRes.response.id;
                await setCachedObject("media_poster:" + media_id, req.session.user._source.username);
            }
            return;
        }
        else if (key === constants.SERVICES.QA){
            if (endpoint === constants.ENDPOINTS.QA_ADD_Q ||
                endpoint === constants.ENDPOINTS.QA_ADD_A){
                let created_id = rabbitRes.response.id;
                let media = (req.body.media == undefined) ? [] : req.body.media;
                let user = req.session.user._source;
                if (endpoint === constants.ENDPOINTS.QA_ADD_Q){
                    let question = {
                        id: created_id,
                        user: {
                            username: user.username,
                            reputation: user.reputation
                        },
                        title: req.body.title,
                        body: req.body.body,
                        score: 0,
                        view_count: 0,
                        answer_count: 0,
                        timestamp: rabbitRes.timestamp,
                        media: media,
                        tags: req.body.tags,
                        accepted_answer_id: null
                    };
                    let views = {
                        authenticated: [],
                        unauthenticated: [],
                        qid: created_id
                    };

                    // update the GET question
                    let question_resp = {status: constants.STATUS_200, response: {status: 'OK', question: question}, views: views};
                    await setCachedObject("get:" + created_id, question_resp);
                    console.log(`${endpoint} caching get resp for ${created_id}`);

                    // update the GET question answers
                    let answers_resp = {status: constants.STATUS_200, response: {status: 'OK', answers: []}};
                    await setCachedObject("question_answers:" + created_id, answers_resp);
                    console.log(`${endpoint} caching get answers resp for ${created_id}`);

                    // update the GET user questions
                    let user_questions = {status: constants.STATUS_200, response: {status: 'OK', questions: [created_id]}};
                    await setCachedObject("user_questions:" + user.username, user_questions);
                    console.log(`${endpoint} caching get user questions for ${user.username}`);
                }
                else if (endpoint === constants.ENDPOINTS.QA_ADD_A){
                    let qid = req.params.qid;
                    let new_answer = {
                        id: created_id,
                        user: user.username,
                        body: req.body.body,
                        score: 0,
                        is_accepted: false,
                        timestamp: rabbitRes.timestamp,
                        media: media
                    };

                    // update the question count;
                    let question_resp = await getCachedObject("get:" + qid);
                    if (question_resp != null){
                        console.log(`${endpoint} updating answer count for ${qid}`)
                        question_resp.response.question.answer_count += 1;
                        await setCachedObject("get:" + qid, question_resp);
                    }

                    // update the GET question answers
                    let question_answers = await getCachedObject("question_answers:" + qid);
                    if (question_answers != null){
                        console.log(`${endpoint} adding new answer ${created_id}`);
                        question_answers.response.answers.push(new_answer)
                        await setCachedObject("question_answers:" + qid, question_answers);
                    }
                    
                    // update the GET user answers
                    let user_answers = await getCachedObject("user_answers:" + user.username);
                    if (user_answers != null){
                        console.log(`${endpoint} updating user answers for ${user.username}`);
                        user_answers.response.answers.push(created_id);
                        await setCachedObject("user_answers:" + user.username, user_answers);   
                    }
                }

                if (media != undefined){
                    for (var media_id of media){
                        await setCachedObject("media:" + media_id, true);
                        await removeCachedObject("media_poster:" + media_id);
                    }
                }
            }
            else if (endpoint === constants.ENDPOINTS.QA_DEL_Q){
                let qid = req.params.qid;

                // delete cached records of used media
                let old_question_resp = await getCachedObject("get:" + qid);
                if (old_question_resp != null && old_question_resp.status === constants.STATUS_400){
                    return;
                }
                if (old_question_resp != null){
                    let media = old_question_resp.response.question.media;
                    if (media != null){
                        for (var media_id of media){
                            await removeCachedObject("media:" + media_id);
                        }
                    }
                }

                // removeCachedObject("get:" + qid);
                let delQuestionResp = new APIResponse();
                delQuestionResp.setERR(constants.ERR_Q_NOTFOUND);
                let newCachedResp = {status: constants.STATUS_400, response: delQuestionResp.toOBJ()};
                await setCachedObject("get:" + qid, newCachedResp);
            }
            else if (endpoint === constants.ENDPOINTS.QA_ACCEPT){
                return;
            }
            else if (endpoint === constants.ENDPOINTS.QA_UPVOTE_Q ||
                    endpoint === constants.ENDPOINTS.QA_UPVOTE_A){
                if (endpoint === constants.ENDPOINTS.QA_UPVOTE_Q){
                    await removeCachedObject("get:" + req.params.qid);
                }
                else if (endpoint === constants.ENDPOINTS.QA_UPVOTE_A){
                    await removeCachedObject("question_answers:" + req.params.aid);
                }
            }
            else if (endpoint === constants.ENDPOINTS.QA_GET_Q){
                let qid = req.params.qid;
                // setCachedObject("views:" + qid, rabbitRes.views);
                await setCachedObject("get:" + qid, rabbitRes);
                // setCachedObject("source:" + qid, rabbitRes.response.question);
            }
            else if (endpoint === constants.ENDPOINTS.QA_GET_A){
                await setCachedObject("question_answers:" + req.params.qid, rabbitRes);
            }
            return;
        }
        else if (key === constants.SERVICES.REGISTER){
            await setCachedObject("register:" + req.body.email, req.body.username);
            return;
        }
        else if (key === constants.SERVICES.SEARCH){
            return;
        }
        else if (key === constants.SERVICES.USER){
            if (endpoint === constants.ENDPOINTS.USER_GET){
                await setCachedObject("user_profile:" + req.params.username, rabbitRes);
            }
            else if (endpoint === constants.ENDPOINTS.USER_Q){
                await setCachedObject("user_questions:" + req.params.username, rabbitRes);
            }
            else if (endpoint === constants.ENDPOINTS.USER_A){
                await setCachedObject("user_answers:" + req.params.username, rabbitRes);
            }
            
            return;
        }
        // should never be reached
        console.log(`[Router] updateRelevantObj on success service=${key}`);
        return;
    }
    else {
        if (key === constants.SERVICES.AUTH){
            return;
        }
        else if (key === constants.SERVICES.EMAIL){
            return;
        }
        else if (key === constants.SERVICES.MEDIA){
            return;
        }
        else if (key === constants.SERVICES.QA){
            if (endpoint === constants.ENDPOINTS.QA_ADD_Q ||
                endpoint === constants.ENDPOINTS.QA_ADD_A){
                return;
            }
            else if (endpoint === constants.ENDPOINTS.QA_DEL_Q){
                return;
            }
            else if (endpoint === constants.ENDPOINTS.QA_ACCEPT){
                return;
            }
            else if (endpoint === constants.ENDPOINTS.QA_UPVOTE_Q ||
                    endpoint === constants.ENDPOINTS.QA_UPVOTE_A){
                return;
            }
            else if (endpoint === constants.ENDPOINTS.QA_GET_Q){
                await setCachedObject("get:" + req.params.qid, rabbitRes);
                return;
            }
            else if (endpoint === constants.ENDPOINTS.QA_GET_A){
                await setCachedObject("question_answers:" + req.params.qid, rabbitRes);
            }
            return;
        }
        else if (key === constants.SERVICES.REGISTER){
            return;
        }
        else if (key === constants.SERVICES.SEARCH){
            return;
        }
        else if (key === constants.SERVICES.USER){
            if (endpoint === constants.ENDPOINTS.USER_GET){
                await setCachedObject("user_profile:" + req.params.username, rabbitRes);
            }
            else if (endpoint === constants.ENDPOINTS.USER_Q){
                await setCachedObject("user_questions:" + req.params.username, rabbitRes);
            }
            else if (endpoint === constants.ENDPOINTS.USER_A){
                await setCachedObject("user_answers:" + req.params.username, rabbitRes);
            }
            return;
        }
        // should never be reached
        console.log(`[Router] updateRelevantObj on fail service=${key}`);
        return;
    }
    
}

/**
 * Determines whether or not the router should wait for a response.
 * @param {string} key routing key for the message (determines which service)
 * @param {string} endpoint which endpoint for the service
 * @param {Request} req Express Request object
 * @param {obj} obj relevant object to the request
 */
async function needToWait(key, endpoint, req, obj){
    if (key === constants.SERVICES.AUTH){
        return true;
    }
    else if (key === constants.SERVICES.EMAIL){
        // let verified = await getCachedObject("verify:" + req.body.email);
        // if (verified != null){
        //     return false;
        // }

        // let registered = obj;
        // if (registered != null && req.body.key === constants.VERIFY_BACKDOOR){
        //     return false;
        // }
        return true;
    }
    else if (key === constants.SERVICES.MEDIA){
        // race condition between adding media and checking if it exists in Cassandra
        // if (req.session.user != undefined){
        //     return false;
        // }
        return true;
    }
    else if (key === constants.SERVICES.QA){
        let user = req.session.user;
        if (endpoint === constants.ENDPOINTS.QA_ADD_Q ||
            endpoint === constants.ENDPOINTS.QA_ADD_A){
            // if (user == undefined ||
            //     req.body.media == undefined || 
            //     req.body.media.length == 0){
            //     return false;
            // }
            // if (endpoint === constants.ENDPOINTS.QA_ADD_A){
            //     let qid = req.params.qid;
            //     let cachedQuestion = await getCachedObject("question_answers:" + qid);
            //     if (cachedQuestion == null){
            //         return true;
            //     }
            // }
            // let all_media_cached = true;
            // for (var media_id of req.body.media){
            //     await touchCachedObject("media:" + media_id);
            //     let media_in_use = await getCachedObject("media:" + media_id);
            //     if (media_in_use != null){
            //         return false;
            //     }
            //     await touchCachedObject("media_poster:" + media_id);
            //     let media_poster = await getCachedObject("media_poster:" + media_id);
            //     if (media_poster == null){
            //         all_media_cached = false;
            //     }
            // }
            // return !all_media_cached;
            return true;
        }
        else if (endpoint === constants.ENDPOINTS.QA_DEL_Q){
            // if the cached object is null, we need to go to the backend
            // return (obj == null) || (user == undefined);
            return true;
        }
        else if (endpoint === constants.ENDPOINTS.QA_ACCEPT){
            // if the cached object is null, we need to go to the backend
            // return (obj == null) || (user == undefined);
            return true;
        }
        else if (endpoint === constants.ENDPOINTS.QA_UPVOTE_Q ||
                endpoint === constants.ENDPOINTS.QA_UPVOTE_A){
            // generate the response without asking the backend
            // return false
            return true;
        }
        else if (endpoint === constants.ENDPOINTS.QA_GET_Q || 
                endpoint === constants.ENDPOINTS.QA_GET_A){
            return (obj == null);
        }
        return true;
    }
    else if (key === constants.SERVICES.REGISTER){
        let registered = await getCachedObject("register:" + req.body.email);
        if (registered != null){
            return false;
        }
        let verified = await getCachedObject("verify:" + req.body.username);
        if (verified != null){
            return false;
        }
        return true;
    }
    else if (key === constants.SERVICES.SEARCH){
        return true;
    }
    else if (key === constants.SERVICES.USER){
        return obj == undefined;
        // if (endpoint === constants.ENDPOINTS.USER_GET){
        //     let user_get = await getCachedObject("user_profile:" + req.params.username);
        //     return user_get != null;
        // }
        // else if (endpoint === constants.ENDPOINTS.USER_Q){
        //     let user_questions = await getCachedObject("user_questions:" + req.params.username);
        //     return user_questions != null;
        // }
        // else if (endpoint === constants.ENDPOINTS.USER_A){
        //     let user_answers = await getCachedObject("user_answers:" + req.params.username);
        //     return user_answers != null;
        // }
        // return true;
    }

    // should never be reached
    console.log(`[Router] needToWait what service is this? ${key}`);
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
    // if (endpoint === constants.ENDPOINTS.QA_ADD_Q && req.body.answers != undefined){
    //     data.body = {};
    // }
    let relevantObj = await getRelevantObj(key, endpoint, data);
    let should_wait = await needToWait(key, endpoint, data, relevantObj);
    let rabbitRes = undefined;
    if (should_wait){
        rabbitRes = await routeRequest(key, endpoint, data);
    }
    else {
        rabbitRes = await generateResponse(key, endpoint, data, relevantObj);
        if (rabbitRes.queue === true){
            if (endpoint === constants.ENDPOINTS.QA_ADD_Q ||
                endpoint === constants.ENDPOINTS.QA_ADD_A || 
                endpoint === constants.ENDPOINTS.MEDIA_ADD){
                data['id'] = rabbitRes.response.id;
            }
            if (endpoint === constants.ENDPOINTS.QA_ADD_Q ||
                endpoint === constants.ENDPOINTS.QA_ADD_A){
                data['timestamp'] = rabbitRes.timestamp;        
            }
            // do NOT await here, just publish it
            routeRequest(key, endpoint, data);
        }
    }
    console.log(`${endpoint}, should_wait=${should_wait}, status=${rabbitRes.status}, queue=${rabbitRes.queue}`);

    // update relevant cached objects
    await updateRelevantObj(key, endpoint, data, rabbitRes);

    // console.log(`endpoint=${endpoint}, resp status=${rabbitRes.status}`);
    res.status(rabbitRes.status);

    // AUTH
    if (rabbitRes.user != undefined){
        req.session.user = rabbitRes.user;
    }
    if (endpoint == constants.ENDPOINTS.AUTH_LOGOUT && rabbitRes.status === constants.STATUS_200){
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

// app.get('/media/:id', async(req,res) => {
//     let endpoint = constants.ENDPOINTS.MEDIA_GET;
//     return await wrapRequest(req, res, constants.SERVICES.MEDIA, endpoint);
// });

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
