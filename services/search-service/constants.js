
function getCurrentTime(){
    return Date.now()/1000;
}

module.exports = {
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