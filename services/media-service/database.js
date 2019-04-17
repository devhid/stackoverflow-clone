const cassandra = require('cassandra-driver');
const uuidv4 = require('uuid/v4');
const constants = require('./constants');

/* client connection options */
const cassandraOptions = { 
    contactPoints: ["127.0.0.1"], 
    localDataCenter: 'datacenter1', 
    keyspace: "media-service" 
};

/* initialize cassandra client */
const client = new cassandra.Client(cassandraOptions);

/* connect to cassandra database */
client.connect()
    .then(() => console.log(`[ Cassandra ] : Successfully established connection to keyspace, '${cassandraOptions.keyspace}'.`))
    .catch((error) => console.log(`[Cassandra] : Could not connect to keyspace, '${cassandraOptions.keyspace}'.`));

async function uploadMedia(filename, content, mimetype) {
    const uuid = uuidv4();
    const query = `INSERT INTO ${cassandraOptions.keyspace}.imgs (uuid, filename, contents, mimetype) VALUES (?, ?, ?, ?)`;
    
    client.execute(query, [uuid, filename, content, mimetype]);

    return uuid;
}

async function getMedia(mediaId) {
    const query = `SELECT filename, contents, mimetype FROM ${cassandraOptions.keyspace}.imgs WHERE id = ?`;
    return new Promise( (resolve, reject) => {
        client.execute(query, [mediaId], { prepare: true}, (error, result) => {
            if(error) {
                reject(new Error(constants.ERR_DB_QUERY_FAILED));
            } else {
                const row = result.first();
                if(row === null) {
                    reject(new Error(constants.ERR_MEDIA_NOT_FOUND));
                    return;
                }
                resolve({"id": row.id, "filename" : row.filename, "content": row.content, "mimetype": row.mimetype});
            }
        });
    });
}