const SERVICES =  {
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

    CASSANDRA_OPTIONS: {
        contactPoints: ["192.168.122.22"], 
        localDataCenter: 'datacenter1', 
        keyspace: "media_service",
        table: "imgs"
    },
    ELASTICSEARCH_OPTIONS: {
        host: "http://admin:ferdman123@130.245.169.86:92"
    },

    SERVICES: SERVICES,    

    RABBOT_SETTINGS: {
        connection: {
            user: 'guest',
            pass: 'guest',
            server: 'localhost',
            port: 5672,
            timeout: 2000,
            vhost: '/'
        },
        exchanges: [
            { name: EXCHANGE.NAME, type: EXCHANGE.TYPE, publishTimeout: 1000, durable: true }
        ],
        queues: [   // for each service, declare and subscribe only to the needed queues
            { name: SERVICES.AUTH, limit: 300, queueLimit: 1000, durable: true, subscribe: true },
            { name: SERVICES.EMAIL, limit: 300, queueLimit: 1000, durable: true, subscribe: true },
            { name: SERVICES.MEDIA, limit: 300, queueLimit: 1000, durable: true, subscribe: true },
            { name: SERVICES.QA, limit: 300, queueLimit: 1000, durable: true, subscribe: true },
            { name: SERVICES.REGISTER, limit: 300, queueLimit: 1000, durable: true, subscribe: true },
            { name: SERVICES.SEARCH, limit: 300, queueLimit: 1000, durable: true, subscribe: true },
            { name: SERVICES.USER, limit: 300, queueLimit: 1000, durable: true, subscribe: true }
        ],
        bindings: [ // for each service, declare only needed bindings
            { exchange: EXCHANGE.NAME, target: SERVICES.AUTH, keys: SERVICES.AUTH },
            { exchange: EXCHANGE.NAME, target: SERVICES.EMAIL, keys: SERVICES.EMAIL },
            { exchange: EXCHANGE.NAME, target: SERVICES.MEDIA, keys: SERVICES.MEDIA },
            { exchange: EXCHANGE.NAME, target: SERVICES.QA, keys: SERVICES.QA },
            { exchange: EXCHANGE.NAME, target: SERVICES.REGISTER, keys: SERVICES.REGISTER },
            { exchange: EXCHANGE.NAME, target: SERVICES.SEARCH, keys: SERVICES.SEARCH },
            { exchange: EXCHANGE.NAME, target: SERVICES.USER, keys: SERVICES.USER }
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

    ERR_MEDIA_INVALID: 'One or more media IDs are invalid or are already in use.',
    ERR_MEDIA_DELETE_FAILED: 'An error occurred while deleting the media.'
};