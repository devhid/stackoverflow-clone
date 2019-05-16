const SERVICES = {
    AUTH: 'auth',
    EMAIL: 'email',
    MEDIA: 'media',
    QA: 'qa',
    REGISTER: 'reg',
    SEARCH: 'search',
    USER: 'user'
};

const EXCHANGE = {
    NAME: 'stackoverflow',
    TYPE: 'direct'
};

module.exports = {
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    STATUS_200: 200,    // OK
    STATUS_400: 400,    // bad request
    STATUS_401: 401,    // unauthorized
    STATUS_403: 403,    // forbidden
    STATUS_404: 404,    // not found
    STATUS_409: 409,    // conflict

    MEMCACHED_LOCATIONS: ['130.245.171.134'],

    REDIS_OPTIONS: {
        host: '192.168.122.40',
        port: 6379,
        pass: 'SWzpgvbqx8GY6Ryvh9HSVAPv6+m6KgqBHesiufT3'
    },

    SERVICES: SERVICES,
    EXCHANGE: EXCHANGE,
    RABBOT_SETTINGS: {
        connection: {
            user: 'so',
            pass: 'so123',
            server: 'localhost',
            port: 5672,
            timeout: 2000,
            vhost: '/'
        },
        exchanges: [
            { name: EXCHANGE.NAME, type: EXCHANGE.TYPE, publishTimeout: 1000, durable: true }
        ]
    },

    ENDPOINTS: {
        AUTH_LOGIN: 'auth_login',
        AUTH_LOGOUT: 'auth_logout',
        EMAIL_VERIFY: 'verify',
        MEDIA_ADD: 'media_add',
        MEDIA_GET: 'media_get',
        QA_ADD_Q: 'qa_add_q',
        QA_GET_Q: 'qa_get_q',
        QA_ADD_A: 'qa_add_a',
        QA_GET_A: 'qa_get_a',
        QA_DEL_Q: 'qa_del_q',
        QA_UPVOTE_Q: 'qa_upvote_q',
        QA_UPVOTE_A: 'qa_upvote_a',
        QA_ACCEPT: 'qa_accept',
        REGISTER: 'register',
        SEARCH: 'search',
        USER_GET: 'user_get',
        USER_Q: 'user_q',
        USER_A: 'user_a'
    },

    RMQ_SUCCESS: 'success',
    RMQ_ERROR: 'error',

    ERR_MISSING_PARAMS: 'Required parameters are missing from the request.',
    ERR_DEL_NOTOWN_Q: 'You cannot delete a question that someone else asked.',
    ERR_GENERAL: 'An error occurred while handling the request.',
    ERR_Q_NOTFOUND: 'The specified question does not exist.',
    ERR_A_NOTFOUND: 'The specified answer does not exist.',
    ERR_NOT_ALLOWED: 'The specified operation is not allowed for the current user.',
    ERR_ALRDY_ACCEPTED: 'An answer has already been accepted.',

    ERR_MEDIA_INVALID: 'One or more media IDs are invalid or are already in use.',
    ERR_MEDIA_DELETE_FAILED: 'An error occurred while deleting the media.',

    VERIFY_BACKDOOR: 'abracadabra'
};