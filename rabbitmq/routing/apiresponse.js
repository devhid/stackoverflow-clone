const constants = require('./constants');

class APIResponse {

    constructor(){
        // do nothing
        this.status = constants.STATUS_ERR;
        this.error = undefined;
    }

    setOK(){
        this.status = constants.STATUS_OK;
        this.error = undefined;
    }

    setERR(err){
        this.status = constants.STATUS_ERR;
        this.error = err;
    }

    toOBJ(){
        if (this.error === undefined){
            return {
                status: this.status
            };
        }
        else {
            return {
                status: this.status,
                error: this.error
            };
        }
    }
}

module.exports = {
    APIResponse: APIResponse
}