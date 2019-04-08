const constants = require('./constants');

class DBResult {

    constructor(status, data){
        this.status = (status === undefined) ? constants.DB_RES_ERROR : status;
        this.data = (data === undefined) ? null : data;
    }

    modify(status, data){
        this.status = status;
        this.data = data;
    }
}

module.exports = {
    DBResult: DBResult
}