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
    STATUS_200: 200,    // OK
    STATUS_400: 400,    // bad request
    STATUS_401: 401,    // unauthorized
    STATUS_403: 403,    // forbidden
    STATUS_404: 404,    // not found
    STATUS_409: 409,    // conflict

    SERVICES: SERVICES,    

    RABBOT_SETTINGS: {
        connection: {
            user: 'so',
            pass: 'so123',
            server: '127.0.0.1',
            port: 5672,
            timeout: 2000,
            vhost: '/'
        },
        exchanges: [
            { name: EXCHANGE.NAME, type: EXCHANGE.TYPE, publishTimeout: 1000, durable: true }
        ],
        queues: [
            { name: SERVICES.AUTH, limit: 300, queueLimit: 1000, durable: true },
            { name: SERVICES.EMAIL, limit: 300, queueLimit: 1000, durable: true },
            { name: SERVICES.MEDIA, limit: 300, queueLimit: 1000, durable: true },
            { name: SERVICES.QA, limit: 300, queueLimit: 1000, durable: true },
            { name: SERVICES.REGISTER, limit: 300, queueLimit: 1000, durable: true },
            { name: SERVICES.SEARCH, limit: 300, queueLimit: 1000, durable: true },
            { name: SERVICES.USER, limit: 300, queueLimit: 1000, durable: true }
        ],
        bindings: [
            { exchange: 'stackoverflow', target: SERVICES.AUTH, keys: SERVICES.AUTH },
            { exchange: 'stackoverflow', target: SERVICES.EMAIL, keys: SERVICES.EMAIL },
            { exchange: 'stackoverflow', target: SERVICES.MEDIA, keys: SERVICES.MEDIA },
            { exchange: 'stackoverflow', target: SERVICES.QA, keys: SERVICES.QA },
            { exchange: 'stackoverflow', target: SERVICES.REGISTER, keys: SERVICES.REGISTER },
            { exchange: 'stackoverflow', target: SERVICES.SEARCH, keys: SERVICES.SEARCH },
            { exchange: 'stackoverflow', target: SERVICES.USER, keys: SERVICES.USER }
        ]
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

    RMQ_SUCCESS: 'success',
    RMQ_ERROR: 'error'
};