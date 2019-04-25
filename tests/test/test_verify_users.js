/* library imports */
const chakram = require('chakram');

/* expect assertion */
var expect = chakram.expect;

const server = "130.245.170.211"
const endpoint = "verify";
const url = `http://${server}/${endpoint}`;

describe("Verification", function() {
    /* add a time out between each test */
    beforeEach(function(done) {
        setTimeout(function() {
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
        let response = chakram.post("http://130.245.170.211/adduser", {
            "email": "buckston1@netscape.com",
            "username": "chamerton1",
            "password": "aEJIsr8xc"
        });

        expect(response).to.have.status(200);
        expect(response).to.have.json('status', 'OK');
        return chakram.wait();
    })

    it("/verify should fail when verifying with wrong key", function() {
        let response = chakram.post(url, {
            "email": "buckston1@netscape.com",
            "key": "wrong-key"
        });

        expect(response).to.have.status(400);
        expect(response).to.have.json('status', 'error');
        return chakram.wait();
    })

    it("/verify should verify a user successfully with right key", function() {
        let response = chakram.post(url, {
            "email": "buckston1@netscape.com",
            "key": "abracadabra"
        });

        expect(response).to.have.status(200);
        expect(response).to.have.json('status', 'OK');
        return chakram.wait();
    })

    it("/verify should fail when verifying non-existant user", function() {
        let response = chakram.post(url, {
            "email": "random-email",
            "key": "random-key"
        });

        expect(response).to.have.status(400);
        expect(response).to.have.json('status', 'error');
        return chakram.wait();
    });

    it("/verify should fail when json body is missing", function() {
        let response = chakram.post(url);

        expect(response).to.have.status(400);
        expect(response).to.have.json('status', 'error');
        return chakram.wait();
    });

    it("/verify should fail when json body has empty fields", function() {
        let response = chakram.post(url, {
            "email": "",
            "key": ""
        });

        expect(response).to.have.status(400);
        expect(response).to.have.json('status', 'error');
        return chakram.wait();
    });
});