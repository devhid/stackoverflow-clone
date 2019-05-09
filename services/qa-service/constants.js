module.exports = {
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    STATUS_200: 200,    // OK
    STATUS_400: 400,    // bad request
    STATUS_401: 401,    // unauthorized
    STATUS_403: 403,    // forbidden
    STATUS_404: 404,    // not found
    STATUS_409: 409,    // conflict
    STATUS_422: 422,    // unprocessable entity

    FRONT_END: {
        //hostname: 'http://130.245.171.47'
        hostname: 'http://localhost:4200'
    },

    AMQP: {
        protocol: 'amqp',
        hostname: '192.168.122.33',
        port: 5672,
        username: 'so',
        password: 'so123',
        locale: 'en_US',
        heartbeat: 5,
    }, 
    CASSANDRA_OPTIONS: {
        contactPoints: ["192.168.122.38"], 
        localDataCenter: 'datacenter1', 
        keyspace: "stackoverflow",
        table: "media"
    },
    ELASTICSEARCH_OPTIONS: {
        host: "http://admin:ferdman123@130.245.169.86:92"
    },
    REDIS_OPTIONS: {
        host: '192.168.122.40',
        port: 6379,
        pass: 'SWzpgvbqx8GY6Ryvh9HSVAPv6+m6KgqBHesiufT3'
    },

    EXCHANGE: {
        TYPE: 'direct',
        NAME: 'stackoverflow',
        PROPERTIES: {
            durable: true
        }
    },

    QUEUE: {
        PROPERTIES: {
            durable: true
        }
    },

    CALLBACK_QUEUE: 'callback',

    SERVICES: {
        AUTH: 'auth',
        EMAIL: 'email',
        MEDIA: 'media',
        QA: 'qa',
        REGISTER: 'reg',
        SEARCH: 'search',
        USER: 'user'
    },

    ENDPOINTS: {
        AUTH_LOGIN: 0,
        AUTH_LOGOUT: 1,
        EMAIL_VERIFY: 2,
        MEDIA_ADD: 3,
        MEDIA_GET: 4,
        QA_ADD_Q: 5,
        QA_GET_Q: 6,
        QA_ADD_A: 7,
        QA_GET_A: 8,
        QA_DEL_Q: 9,
        QA_UPVOTE_Q: 10,
        QA_UPVOTE_A: 11,
        QA_ACCEPT: 12,
        REGISTER: 13,
        SEARCH: 14,
        USER_GET: 15,
        USER_Q: 16,
        USER_A: 17
    },

    QUESTION_KEY: 'question',
    ANSWERS_KEY: 'answers',
    ID_KEY: 'id',

    DB_RES_SUCCESS: 'success',
    DB_RES_ERROR: 'error',
    DB_RES_Q_NOTFOUND: 'q notfound',
    DB_RES_A_NOTFOUND: 'a notfound',
    DB_RES_NOT_ALLOWED: 'operation not allowed',
    DB_RES_ALRDY_ACCEPTED: 'a alrdy accepted',
    DB_RES_MEDIA_INVALID: 'media invalid or in use',

    ERR_MISSING_PARAMS: 'Required parameters are missing from the request.',
    ERR_DEL_NOTOWN_Q: 'You cannot delete a question that someone else asked.',
    ERR_GENERAL: 'An error occurred while handling the request.',
    ERR_Q_NOTFOUND: 'The specified question does not exist.',
    ERR_A_NOTFOUND: 'The specified answer does not exist.',
    ERR_NOT_ALLOWED: 'The specified operation is not allowed for the current user.',
    ERR_ALRDY_ACCEPTED: 'An answer has already been accepted.',
    ERR_MALFORMED: 'The request was malformed. Required parameters are missing.',

    ERR_MEDIA_INVALID: 'One or more media IDs are invalid or are already in use.',
    ERR_MEDIA_DELETE_FAILED: 'An error occurred while deleting the media.'
};