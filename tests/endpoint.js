class Endpoint {
    constructor(server) {
        this.server = server;
        this.url = "";
    }

    setEndpoint(endpoint) {
        this.url = "http://" + this.server + endpoint;
    }

    setParam(param) {
        this.url = this.url.includes('{id}') ? this.url.replace('{id}', param) : this.url;
    }

    getUrl() {
        return this.url;
    }
}

module.exports = Endpoint;