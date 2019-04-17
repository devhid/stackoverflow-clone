module.exports = {
    STATUS_KEY: 'status',
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    ID_KEY: 'id',

    ERR_NOT_LOGGED_IN: 'User must be logged in to perform this request.',
    ERR_MISSING_FILE: 'No file was uploaded.',
    ERR_MEDIA_NOT_FOUND: 'No media was found by that id.',
    ERR_MEDIA_QUERY_FAILED: 'Media retrieval failed. Media id is likely undefined.',
    ERR_MEDIA_TOO_LARGE: 'Media upload failed. File size is likely too large.',

    CASSANDRA_OPTIONS: {
        contactPoints: ["127.0.0.1"], 
        localDataCenter: 'datacenter1', 
        keyspace: "media_service" 
    }
};