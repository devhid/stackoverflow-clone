/* library imports */
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const multer = require('multer');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8003;

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

/* enable CORS */
app.use(function(req, res, next) {
    res.set('Access-Control-Allow-Origin', constants.FRONT_END.hostname);
    res.set('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Credentials', 'true');
    next();
});

/* parse incoming requests data as json */
app.use(express.json());

app.post('/addmedia', upload.single('content'), async (req,res) => {
    let data = {
        session: {user: ((req.session == undefined) ? undefined : req.session.user)},
        params: req.params,
        body: req.body,
        file: req.file
    };
    let dbRes = await addMedia(data);
    res.status(dbRes.status);
    if (dbRes.content_type != undefined){
        res.set('Content-Type', dbRes.content_type);
        if (dbRes.media != undefined && dbRes.media.type === "Buffer"){
            return res.send(Buffer.from(dbRes.media.data));
        }
    }
    return res.json(dbRes.response);
});

app.get('/media/:id', async(req,res) => {
    let data = {
        session: {user: ((req.session == undefined) ? undefined : req.session.user)},
        params: req.params,
        body: req.body,
        file: req.file
    };
    let dbRes = await getMedia(data);
    res.status(dbRes.status);
    if (dbRes.content_type != undefined){
        res.set('Content-Type', dbRes.content_type);
        if (dbRes.media != undefined){
            return res.send(dbRes.media);
        }
    }
    return res.json(dbRes.response);
});


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

    const username = user._source.username;
    const filename = req.file.originalname;
    const content = req.file.buffer;
    const mimetype = req.file.mimetype;

    // get generated id from uploading media
    let mediaId = null;
    try {
        mediaId = await database.uploadMedia(username, filename, content, mimetype);
    } catch(err) {
        response = generateERR(constants.STATUS_400, err);
        return response;
    }

    response = generateOK();
    response.response[constants.ID_KEY] = mediaId;
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
    response['media'] = image.content;
    return response;
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