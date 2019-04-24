/* library imports */
const chakram = require('chakram');

/* internal imports */
const constants = require('../constants');
const cleardb = require('../cleardb');
const Endpoint = require('../endpoint');

/* expect assertion */
var expect = chakram.expect;

/* the endpoint the test will make a request to */
let endpoint = new Endpoint(constants.ROUTER_IP);

describe("Questions", function() {
    /* add a time out between each test */
    // beforeEach(function(done) {
    //     setTimeout(function() {
    //         done();
    //     }, 500);
    // });

    /* clear the database */
    before(function(done) {
        cleardb.clearAll(done);
    });

    it('/adduser should successfully create a new user', function() {
        endpoint.setEndpoint(constants.ENDPOINTS.REGISTER);

        let response = chakram.post(endpoint.getUrl(), {
            "email": "cfrancillo3@4shared.com",
            "username": "pgeorges3",
            "password": "oZKaZSNx"
        });

        expect(response).to.have.status(200);
        expect(response).to.have.json('status', 'OK');

        return chakram.wait();
    });

    it('/verify should verify the user successfully', function() {
        endpoint.setEndpoint(constants.ENDPOINTS.EMAIL_VERIFY);

        let response = chakram.post(endpoint.getUrl(), {
            "email": "cfrancillo3@4shared.com",
            "key": "abracadabra"
        });

        expect(response).to.have.status(200);
        expect(response).to.have.json('status', 'OK');

        return chakram.wait();
    });

    it('/login should log the user in succesfully', function() {
        endpoint.setEndpoint(constants.ENDPOINTS.AUTH_LOGIN);
        
        let response = chakram.post(endpoint.getUrl(), {
            "username": "pgeorges3",
            "password": "oZKaZSNx"
        });

        expect(response).to.have.status(200);
        expect(response).to.have.json('status', 'OK');
        expect(response).to.have.cookie('soc_login');

        return chakram.wait();
    });
});