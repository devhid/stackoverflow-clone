/* library imports */
const MongoClient = require('mongodb').MongoClient;
const debug = require('debug');
const assert = require('assert');
const uuidv4 = require('uuid/v4');
const cassandra = require('cassandra-driver');

/* internal imports */
const constants = require('./constants');
const DBResult = require('./dbresult').DBResult;

/* log function: `DEBUG=mongo:qa node index.js` */
const logMongo = debug('mongo:qa');
const logCassandra = debug('cassandra:qa');

/* database reference */
let db = null;

/* connect to mongodb and set reference to database object */
MongoClient.connect(constants.MONGODB_OPTIONS.host, {"useNewUrlParser": true}, function(err, client) {
    if(err) {
        logMongo(`[Error] MongoClient.connect() - ${err}`);
    } else {
        logMongo("Successfully connected.");
        db = client.db(constants.MONGODB_OPTIONS.database);
    }
});

/* connect to cassandra */
const cassandraOptions = constants.CASSANDRA_OPTIONS;
const cassandraClient = new cassandra.Client(cassandraOptions);
cassandraClient.connect()
    .then(() => {
        logCassandra(`Successfully established connection to keyspace, '${cassandraOptions.keyspace}'.`)
    }).catch((error) => {
        logCassandra(`[Error] Could not connect to keyspace, '${cassandraOptions.keyspace}'.`);
        logCassandra(`[Error] cassandraClient.connect() - ${error}`)
    });

/**
 * Closes cassandra connection.
 */
function closeCassandra() {
    cassandraClient.shutdown();
}

/**
 * Transforms a JavaScript array of strings into a Cassandra parenthesized list of strings.
 * @param {string[]} arr JS array of strings
 * @param {boolean} quotes whether or not we want quotes around each element
 */
function transformArrToCassandraList(arr, quotes){
    var list = `(`;
    for (var elem of arr){
        list += (quotes) ? `'${elem}',` : `${elem},`;
    }
    list = list.substring(0,list.length-1);
    list += `)`;
    return list;
}

module.exports = {
    closeCassandra: closeCassandra
}