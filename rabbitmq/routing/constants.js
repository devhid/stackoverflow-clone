module.exports = {
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    AMQP_HOST: 'amqp://localhost',

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

    KEYS: {
        AUTH: 'auth',
        EMAIL: 'email',
        MEDIA: 'media',
        QA: 'qa',
        REGISTER: 'reg',
        SEARCH: 'search',
        USER: 'user'
    },

    RMQ_SUCCESS: 'success',
    RMQ_ERROR: 'error',
    RMQ_ERR_TOO_LONG: 'Took too long to respond'
};