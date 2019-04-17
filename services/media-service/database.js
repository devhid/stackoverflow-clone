/* client connection options */
const cassandraOptions = { 
    contactPoints: ["127.0.0.1"], 
    localDataCenter: 'datacenter1', 
    keyspace: "media-service" 
};

/* initialize cassandra client */
const client = new cassandra.Client(connectionOptions);

/* connect to cassandra database */
client.connect().then(() => console.log(`[+] Successfully established connection to keyspace, '${connectionOptions.keyspace}'.`));

async function uploadMedia(filename, content, mimetype) {

}

async function getMedia(filename) {
    
}