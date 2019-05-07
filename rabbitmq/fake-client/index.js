/* library imports */
const express = require('express');
const rabbot = require('rabbot');

/* internal imports */
const constants = require('./constants');
const database = require('./database');

/* initialize express application */
const app = express();
require('express-async-errors');

/* the port the server will listen on */
const PORT = 8009;

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

/* configure rabbot */
rabbot.configure(constants.RABBOT_SETTINGS).done(function(){
    console.log('[Rabbot-Router] Rabbot configured...');
});

/* install handlers */
rabbot.handle({
    queue: constants.SERVICES.QA,
    type: constants.ENDPOINTS.QA_ADD_Q,
    autoNack: false,
    handler: database.HANDLERS.QA_ADD_Q
});

/* Start the server. */
var server = app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
