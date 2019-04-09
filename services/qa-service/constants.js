module.exports = {
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    QUESTION_KEY: 'question',
    ANSWERS_KEY: 'answers',
    ID_KEY: 'id',

    DB_RES_SUCCESS: 'success',
    DB_RES_ERROR: 'error',
    DB_RES_Q_NOTFOUND: 'q notfound',
    DB_RES_A_NOTFOUND: 'a notfound',
    DB_RES_NOT_ALLOWED: 'operation not allowed',

    ERR_MISSING_PARAMS: 'Required parameters are missing from the request.',
    ERR_DEL_NOTOWN_Q: 'You cannot delete a question that someone else asked.',
    ERR_GENERAL: 'An error occurred while handling the request.',
    ERR_Q_NOTFOUND: 'The specified question does not exist.',
    ERR_A_NOTFOUND: 'The specified answer does not exist.',
    ERR_NOT_ALLOWED: 'The specified operation is not allowed for the current user.'
};