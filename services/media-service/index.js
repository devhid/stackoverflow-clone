/* library imports */
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const multer = require('multer');
const rabbot = require('rabbot');

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8007;

/* redis */
const sessionOptions = {
    name: 'soc_login',
    secret: 'EditThisLaterWithARealSecret',
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
    res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Credentials', 'true');
    next();
});

/* parse incoming requests data as json */
app.use(express.json());

rabbot.nackOnError();

/* install handlers */
rabbot.handle({
    queue: constants.SERVICES.MEDIA,
    type: constants.ENDPOINTS.MEDIA_ADD,
    autoNack: false,
    handler: addMedia
});

/* configure rabbot */
rabbot.configure(constants.RABBOT_SETTINGS)
    .then(function(){
        console.log('[Rabbot] Rabbot configured...');
    }).catch(err => {
        console.log(`[Rabbot] err ${err}`);
    });

/* ------------------ ENDPOINTS ------------------ */

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
        if (dbRes.media != undefined && dbRes.media.type === "Buffer"){
            return res.send(Buffer.from(dbRes.media.data));
        }
    }
    return res.json(dbRes.response);
});


/* ------------------ ENDPOINTS ------------------ */

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
    response.response[constants.ID_KEY] = mediaId;
    return response;
}

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
    rabbot.shutdown(true);
    server.close();
}