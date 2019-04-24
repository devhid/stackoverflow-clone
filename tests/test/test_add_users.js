/* library imports */
const chakram = require('chakram');

/* internal imports */
const cleardb = require('../clear_db');

/* expect assertion */
var expect = chakram.expect;

const server = "130.245.170.211"
const endpoint = "adduser";
const url = `http://${server}/${endpoint}`;

describe("Registration", function() {
    /* add a time out between each test */
    beforeEach(function (done) {
        setTimeout(function(){
            done();
        }, 500);
    });

    /* clear the users index before testing */
    before(function() {
        chakram.post(`http://admin:ferdman123@130.245.169.86:92/users/_delete_by_query`, {
            "query": { "match_all": {} }
        });
    });

    it("/adduser should add a user successfully", function() {
        let response = chakram.post(url, {
            "email": "buckston1@netscape.com",
            "username": "chamerton1",
            "password": "aEJIsr8xc"
        });

        expect(response).to.have.status(200);
        expect(response).to.have.json('status', 'OK');
        return chakram.wait();
    })

    it("/adduser should fail when adding user with same username", function() {
        let response = chakram.post(url, {
            "email": "random-email",
            "username": "chamerton1",
            "password": "aEJIsr8xc"
        });

        expect(response).to.have.status(400);
        expect(response).to.have.json('status', 'error');
        return chakram.wait();
    });

    it("/adduser should fail when adding user with same email", function() {
        let response = chakram.post(url, {
            "email": "buckston1@netscape.com",
            "username": "random-username",
            "password": "aEJIsr8xc"
        });

        expect(response).to.have.status(400);
        expect(response).to.have.json('status', 'error');
        return chakram.wait();
    });

    it("/adduser should fail when json body is missing", function() {
        let response = chakram.post(url);

        expect(response).to.have.status(400);
        expect(response).to.have.json('status', 'error');
        return chakram.wait();
    });

    it("/adduser should fail when json body has empty fields", function() {
        let response = chakram.post(url, {
            "email": "",
            "username": "",
            "password": ""
        });

        expect(response).to.have.status(400);
        expect(response).to.have.json('status', 'error');
        return chakram.wait();
    });
});