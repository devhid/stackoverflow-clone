/* library imports */
const chakram = require('chakram');

/* internal imports */
const Endpoint = require('../endpoint');
const constants = require('../constants')

/* expect assertion */
var expect = chakram.expect;

/* the endpoint the test will make a request to */
let endpoint = Endpoint(constants.ROUTER_IP);

describe("Authentication", function() {
    /* add a time out between each test */
    beforeEach(function(done) {
        setTimeout(function() {
            done();
        }, 500);
    });

    /* clear the database */
    before(function() {

    });

    endpoint.setEndpoint(constants.ENDPOINTS.REGISTER);

});