
function getCurrentTime(){
    return Date.now() / 1000;
}

module.exports = {
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    STATUS_200: 200,    // OK
    STATUS_400: 400,    // bad request
    STATUS_401: 401,    // unauthorized
    STATUS_403: 403,    // forbidden
    STATUS_404: 404,    // not found
    STATUS_409: 409,    // conflict

    currentTime: getCurrentTime,

    DEFAULT_LIMIT: 25,
    DEFAULT_MAX_LIMIT: 100,

    DEFAULT_Q: "",
    DEFAULT_SORT_BY: "score",
    DEFAULT_TAGS: [],
    DEFAULT_HAS_MEDIA: false,
    DEFAULT_ACCEPTED: false,

    ERR_INVALID_SORT: "The specified sort method is invalid."
}
