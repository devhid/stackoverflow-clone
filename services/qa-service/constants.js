module.exports = {
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    STATUS_200: 200,    // OK
    STATUS_400: 400,    // bad request
    STATUS_401: 401,    // unauthorized
    STATUS_403: 403,    // forbidden
    STATUS_404: 404,    // not found
    STATUS_409: 409,    // conflict

    QUESTION_KEY: 'question',
    ANSWERS_KEY: 'answers',
    ID_KEY: 'id',

    DB_RES_SUCCESS: 'success',
    DB_RES_ERROR: 'error',
    DB_RES_Q_NOTFOUND: 'q notfound',
    DB_RES_A_NOTFOUND: 'a notfound',
    DB_RES_NOT_ALLOWED: 'operation not allowed',
    DB_RES_ALRDY_ACCEPTED: 'a alrdy accepted',
    DB_RES_MEDIA_IN_USE: 'media in use',

    ERR_MISSING_PARAMS: 'Required parameters are missing from the request.',
    ERR_DEL_NOTOWN_Q: 'You cannot delete a question that someone else asked.',
    ERR_GENERAL: 'An error occurred while handling the request.',
    ERR_Q_NOTFOUND: 'The specified question does not exist.',
    ERR_A_NOTFOUND: 'The specified answer does not exist.',
    ERR_NOT_ALLOWED: 'The specified operation is not allowed for the current user.',
    ERR_ALRDY_ACCEPTED: 'An answer has already been accepted.',

    ERR_MEDIA_IN_USE: 'One or more media IDs are already in use.',
    ERR_MEDIA_DELETE_FAILED: 'An error occurred while deleting the media.',

    CASSANDRA_OPTIONS: {
        contactPoints: ["192.168.122.22"], 
        localDataCenter: 'datacenter1', 
        keyspace: "media_service",
        table: "imgs"
    }
};