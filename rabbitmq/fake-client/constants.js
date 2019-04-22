module.exports = {
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    AMQP_HOST: 'amqp://130.245.168.36',

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

    DB_RES_SUCCESS: 'success',
    DB_RES_ERROR: 'error',
    DB_RES_ERR_TOO_LONG: 'Took too long to respond'
};