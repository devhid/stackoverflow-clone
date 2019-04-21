module.exports = {
    STATUS_KEY: 'status',
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    STATUS_200: 200,    // OK
    STATUS_400: 400,    // bad request
    STATUS_401: 401,    // unauthorized
    STATUS_403: 403,    // forbidden
    STATUS_404: 404,    // not found
    STATUS_409: 409,    // conflict

    USER_KEY: 'user',
    QUESTIONS_KEY: 'questions',
    ANSWERS_KEY: 'answers',

    ERR_MISSING_UID: 'The username parameter was not specified.',
    ERR_UNKNOWN_USER: 'No user found from that username.',
};
