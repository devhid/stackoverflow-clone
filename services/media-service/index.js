/* library imports */
const express = require('express');
const session = require('express-session');
const cassandra = require('cassandra-driver');
const multer = require('multer');
const RedisStore = require('connect-redis')(session);

/* internal imports */
const database = require('./database');
const constants = require('./constants');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8007;

/* image upload destination */
const upload = multer();

/* options for the redis store */
const redisOptions = {
    host: '64.52.162.153',
    port: 6379,
    pass: 'SWzpgvbqx8GY6Ryvh9HSVAPv6+m6KgqBHesiufT3'
};

/* options for the session */
const sessionOptions = {
    name: 'soc_login',
    secret: 'EditThisLaterWithARealSecret',
    unset: 'destroy',
    resave: false,
    saveUninitialized: true,
    logErrors: true,
    store: new RedisStore(redisOptions)
};

/* enable CORS */
app.use(function(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
});

/* handle user sessions */
app.use(session(sessionOptions));

/* parse incoming requests data as json */
app.use(express.json());

app.post('/addmedia', upload.single('content'), async (req, res) => {
    let response = generateERR();

    if(req.user === undefined) {
        res.status = constants.STATUS_401;
        response[constants.STATUS_ERR] = constants.ERR_NOT_LOGGED_IN;
        return res.json(response);
    }

    if(req.file === undefined) {
        res.status = constants.STATUS_400;
        response[constants.STATUS_ERR] = constants.ERR_MISSING_FILE;
        return res.json(response);
    }

    const filename = req.file.originalname;
    const content = req.file.buffer;
    const mimetype = req.file.mimetype;

    /* get generated id from uploading media */
    let mediaId = null;
    try {
        mediaId = await database.uploadMedia(filename, content, mimetype);
    } catch(err) {
        response[constants.STATUS_ERR] = err;
        return res.json(response);
    }

    res.status = constants.STATUS_200;
    response = generateOK();
    response[constants.ID_KEY] = mediaId;
    return res.json(response);
});

app.get('/media/:id', async (req, res) => {
    let response = generateERR();

    const mediaId = req.params['id'];
    let image = null;

    try {
        image = await database.getMedia(mediaId);
    } catch(err) {
        res.status = constants.STATUS_400;
        response[constants.STATUS_ERR] = err;
        return res.json(response);
    }

    res.status = constants.STATUS_200;
    res.set({ 'Content-Type': image.mimetype });
    return res.send(image.content);
});

/* helper funcs */
function generateOK(){
    let response = {};
    response[constants.STATUS_KEY] = constants.STATUS_OK;
    return response;
}

function generateERR(){
    let response = {};
    response[constants.STATUS_KEY] = constants.STATUS_ERR;
    response[constants.STATUS_ERR] = '';
    return response;
}

/* Start the server. */
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}...`));

