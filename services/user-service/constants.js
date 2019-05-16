const SERVICES =  {
    AUTH: 'auth',
    EMAIL: 'email',
    MEDIA: 'media',
    QA: 'qa',
    REGISTER: 'reg',
    SEARCH: 'search',
    USER: 'user'
};

const EXCHANGE = {
    NAME: 'stackoverflow',
    TYPE: 'direct'
};

module.exports = {
    STATUS_KEY: 'status',
    STATUS_OK: 'OK',
    STATUS_ERR: 'error',

    STATUS_200: 200,    // OK
    STATUS_400: 400,    // bad request
    STATUS_401: 401,    // unauthorized
    STATUS_403: 403,    // forbidden
    STATUS_404: 404,    // not found
    STATUS_409: 409,    // conflict

    CASSANDRA_OPTIONS: {
        contactPoints: ["192.168.122.38"], 
        localDataCenter: 'datacenter1', 
        keyspace: "stackoverflow",
        table: "media"
    },
    ELASTICSEARCH_OPTIONS: {
        host: "http://admin:ferdman123@130.245.169.86:92"
    },

    MONGODB_OPTIONS: {
        host: "mongodb://130.245.171.134:27017",
        database: "stackoverflow"
    },

    COLLECTIONS: {
        USERS: "users",
        QUESTIONS: "questions",
        ANSWERS: "answers",
        VIEWS: "views",
        Q_UPVOTES: "q-upvotes",
        A_UPVOTES: "a-upvotes",
        MEDIA: "media"
    },

    SERVICES: SERVICES,    

    RABBOT_SETTINGS: {
        connection: {
            user: 'so',
            pass: 'so123',
            server: '192.168.122.39',
            port: 5672,
            timeout: 2000,
            vhost: '/',
            replyQueue: 'user-reply'
        },
        exchanges: [
            { name: EXCHANGE.NAME, type: EXCHANGE.TYPE, publishTimeout: 1000, durable: true }
        ],
        queues: [   // for each service, declare and subscribe only to the needed queues
            { name: SERVICES.USER, limit: 300, queueLimit: 1000, durable: true, subscribe: true }
        ],
        bindings: [ // for each service, declare only needed bindings
            { exchange: EXCHANGE.NAME, target: SERVICES.USER, keys: SERVICES.USER }
        ]
    },

    ENDPOINTS: {
        AUTH_LOGIN: 'auth_login',
        AUTH_LOGOUT: 'auth_logout',
        EMAIL_VERIFY: 'verify',
        MEDIA_ADD: 'media_add',
        MEDIA_GET: 'media_get',
        QA_ADD_Q: 'qa_add_q',
        QA_GET_Q: 'qa_get_q',
        QA_ADD_A: 'qa_add_a',
        QA_GET_A: 'qa_get_a',
        QA_DEL_Q: 'qa_del_q',
        QA_UPVOTE_Q: 'qa_upvote_q',
        QA_UPVOTE_A: 'qa_upvote_a',
        QA_ACCEPT: 'qa_accept',
        REGISTER: 'register',
        SEARCH: 'search',
        USER_GET: 'user_get',
        USER_Q: 'user_q',
        USER_A: 'user_a'
    },

    USER_KEY: 'user',
    QUESTIONS_KEY: 'questions',
    ANSWERS_KEY: 'answers',

    ERR_MISSING_UID: 'The username parameter was not specified.',
    ERR_UNKNOWN_USER: 'No user found from that username.',
};
