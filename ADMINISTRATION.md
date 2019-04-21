<h1 align='center'> bufferunderflow deploy administration </h1>

### Service Deploy Locations

|      Service       |       IP        |  ssh auth credentials  |
| :----------------: | :-------------: | :--------------------: |
|   authentication   |  64.190.90.243  |         ubuntu         |
| email-verification |  207.148.20.88  | root, Ws?69o5WNBQM#6R5 |
|       media        |  130.245.171.75 |         ubuntu         |
|         qa         |  140.82.9.197   | root, Ub+7Bjkf*JDB+3jT |
|    registration    | 130.245.171.197 |         ubuntu         |
|       search       |  64.190.91.125  |         ubuntu         |

### Frameworks and Tools

* ### Kibana @ 107.191.43.73

  A friendly UI for Elasticsearch. Authentication required.

* ### Elasticsearch @ 107.191.43.73:92

  Main storage.

  <u>Examples</u>:

  - To make a `GET` request for all documents in the index `users`,

    ​	``` GET http://<user>:<pass>@107.191.43.73:9200/users/_search?pretty=true&q=*:*```

* ### Redis @ 64.52.162.153:6379

  Stateful session management for the microservices. Authentication required.