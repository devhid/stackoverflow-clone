const constants = require('./constants');

class APIResponse {

    constructor(){
        // do nothing
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
        if (error === undefined){
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