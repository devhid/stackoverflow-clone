/* library imports */
const cassandra = require('cassandra-driver');
const Uuid = cassandra.types.Uuid;

/* internal imports */
const constants = require('./constants');

/* cassandra connection options */
const cassandraOptions = constants.CASSANDRA_OPTIONS;

/* initialize cassandra client */
const client = new cassandra.Client(cassandraOptions);

/* connect to cassandra database */
client.connect()
    .then(() => console.log(`[ Cassandra ] : Successfully established connection to keyspace, '${cassandraOptions.keyspace}'.`))
    .catch((error) => console.log(`[Cassandra] : Could not connect to keyspace, '${cassandraOptions.keyspace}'.`));

async function uploadMedia(filename, content, mimetype) {
    const uuid = Uuid.random();
    const query = `INSERT INTO ${cassandraOptions.keyspace}.imgs (id, content, filename, mimetype, qa_id) VALUES (?, ?, ?, ?, ?)`;
    
    return new Promise( (resolve, reject) => {
        client.execute(query, [uuid, content, filename, mimetype, ''], { prepare: true }, (error, result) => {
            if(error) {
                reject(constants.ERR_MEDIA_TOO_LARGE);
            } else {
                resolve(uuid);
            }
        });
    });
}

async function getMedia(mediaId) {
    const query = `SELECT id, filename, content, mimetype FROM ${cassandraOptions.keyspace}.imgs WHERE id=?`;
    return new Promise( (resolve, reject) => {
        client.execute(query, [mediaId], { prepare: true}, (error, result) => {
            if(error) {
                reject(constants.ERR_MEDIA_QUERY_FAILED);
            } else {
                const row = result.first();
                if(row === null) {
                    reject(constants.ERR_MEDIA_NOT_FOUND);
                    return;
                }
                resolve({"id": row.id, "filename" : row.filename, "content": row.content, "mimetype": row.mimetype});
            }
        });
    });
}

module.exports = {
    uploadMedia: uploadMedia,
    getMedia: getMedia
}