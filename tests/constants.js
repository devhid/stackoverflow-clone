module.exports = {

    ROUTER_IP: "130.245.170.211",
    ELASTICSEARCH_IP: "admin:ferdman123@130.245.169.86:92",

    ENDPOINTS: {
        AUTH_LOGIN: '/login',
        AUTH_LOGOUT: '/logout',
        EMAIL_VERIFY: '/verify',
        MEDIA_ADD: '/addmedia',
        MEDIA_GET: '/media/{id}',
        QA_ADD_Q: '/questions/add',
        QA_GET_Q: '/questions/{id}',
        QA_ADD_A: '/questions/{id}/answers/add',
        QA_GET_A: '/questions/{id}/answers',
        QA_DEL_Q: '/questions/{id}/delete',
        QA_UPVOTE_Q: '/questions/{id}/upvote',
        QA_UPVOTE_A: '/answers/{id}/upvote',
        QA_ACCEPT: '/answers/{id}/accept',
        REGISTER: '/adduser',
        SEARCH: '/search',
        USER_GET: '/user/{id}',
        USER_Q: '/user/{id}/questions',
        USER_A: '/user/{id}/answers'
    }
}