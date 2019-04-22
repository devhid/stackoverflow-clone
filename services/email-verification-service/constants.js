module.exports = {
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    STATUS_200: 200,    // OK
    STATUS_400: 400,    // bad request
    STATUS_401: 401,    // unauthorized
    STATUS_403: 403,    // forbidden
    STATUS_404: 404,    // not found
    STATUS_409: 409,    // conflict

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

    ENDPOINTS: {
        EMAIL_VERIFY: 2
    }
}
