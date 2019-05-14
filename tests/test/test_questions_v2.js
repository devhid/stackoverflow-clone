/* library imports */
const request = require('request');

/* system imports */
const fs = require('fs');

/* internal imports */
const constants = require('../constants');

const server = constants.ROUTER_IP;
const endpoint = constants.ENDPOINTS.QA_ADD_Q;
const url = `http://${server}${endpoint}`;
const cookie = "soc_login=s%3A4UMuuCssy2IuHNCTpGdwxLRvCKjgvSwi.ZofpZ0u2b%2FAUnSXL5Ill59tPfOspRSoi78yXV0TILfU";

const contents = fs.readFileSync('/Users/mgulati/Documents/vscode-projects/stackoverflow-clone/tests/data/questions_proper.json', 'utf8');
const lines = JSON.parse(contents);

let count = 0;

function main() {
    clearDatabase();
    let numRequests = 0;

    for(let json of lines) {
        let question = { "title": json['title'], "body": json['body'], "tags": json['tags'].split('|') };
        let options = { json: question, headers: {'Cookie': cookie } };
        
        let startTime = new Date().getTime();

        request.post(url, options, function(error, response, body) {
            if(error) {
                // console.log(error.errno);
            } else {
                // console.log(`[${response.statusCode}]: Took ${startTime - new Date().getTime()}ms`);
                count = response.statusCode != 200 ? count++ : count;

                if(numRequests === 200) {
                    console.log(`${count}/${lines.length} requests have failed.`);
                }

                numRequests++;
            }
        });
    }
}

function clearDatabase() {
    const indices = ["users","questions","answers","views","q-upvotes","a-downvotes"];
    for(var index of indices) {
        request.post(`http://${constants.ELASTICSEARCH_IP}/${index}/_delete_by_query`, options={ json:{"query": { "match_all": {} } }}, function(error, response, body) {});
    }
}

clearDatabase();