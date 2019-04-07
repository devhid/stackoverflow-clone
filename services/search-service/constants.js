
function getCurrentTime(){
    return Date.now()/1000;
}

module.exports = {
    currentTime: getCurrentTime,
    DEFAULT_LIMIT: 25,
    DEFAULT_MAX_LIMIT: 100,
    DEFAULT_ACCEPTED: false
}