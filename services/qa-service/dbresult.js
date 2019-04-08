const constants = require('./constants');

class DBResult {

    status = constants.DB_RES_ERROR;
    data = null;

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