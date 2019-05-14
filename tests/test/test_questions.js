/* library imports */
const chakram = require('chakram');

/* system imports */
const fs = require('fs');

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
        /* preserve cookies for future requests */
        chakram.setRequestDefaults({jar: true});

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

    it('/question should fail when adding extra fields', function() {
        chakram.setRequestDefaults({jar: true});

        endpoint.setEndpoint(constants.ENDPOINTS.QA_ADD_Q);

        let response = chakram.post(endpoint.getUrl(), {
            "title": "test-question",
            "body": "test-body",
            "tags": ["tag1", "tag2"],
            "answers": ["answer1", "answer2"]
        });

        expect(response).to.have.cookie('soc_login');
        expect(response).to.have.status(400);
        expect(response).to.have.json('status', 'error');

        return chakram.wait();
    });

    describe("Stress Test for Adding Questions", function() {
        const contents = fs.readFileSync('/Users/mgulati/Documents/vscode-projects/stackoverflow-clone/tests/data/questions.json', 'utf8');
        const lines = contents.toString().split("\n");

        for(let line of lines) {     
            let json = null;       
            try {
                json = JSON.parse(line);
            } catch(err) { continue; }

            question = {
                "title": json['title'],
                "body": json['body'],
                "tags": json['tags'].split('|')
            }

            it('/questions/add should create a new question', function() {  
                endpoint.setEndpoint(constants.ENDPOINTS.QA_ADD_Q);    
                let response = chakram.post(endpoint.getUrl(), question);

                expect(response).to.have.cookie('soc_login');
                expect(response).to.have.status(200);
                expect(response).to.have.json('status', 'OK');

                return chakram.wait();
            });
        }
    });
});