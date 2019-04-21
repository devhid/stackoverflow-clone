const constants = require('./constants');

class DBResult {

    constructor(status, data){
        this.status = (status === undefined) ? constants.DB_RES_ERROR : status;
        this.data = (data === undefined) ? null : data;
    }

    get status(){
        return this._status;
    }

    set status(status){
        this._status = status;
    }

    get data(){
        return this._data;
    }

    set data(data){
        this._data = data;
    }

}

module.exports = {
    DBResult: DBResult
}