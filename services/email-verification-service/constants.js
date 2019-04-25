module.exports = {
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    STATUS_200: 200,    // OK
    STATUS_400: 400,    // bad request
    STATUS_401: 401,    // unauthorized
    STATUS_403: 403,    // forbidden
    STATUS_404: 404,    // not found
    STATUS_409: 409,    // conflict

    FRONT_END: {
        hostname: 'http://130.245.171.47'
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
    ELASTICSEARCH_OPTIONS: {
        host: "http://admin:ferdman123@130.245.169.86:92"
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
}
