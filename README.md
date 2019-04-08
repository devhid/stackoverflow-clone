<h1 align=center>stackoverflow-clone</h1>
<p align=center>A minimal clone of StackOverflow built for our Cloud Computing course.</p>

## Deployments

### Authentication
* Hosted on `64.190.90.243`

### Kibana
* Visit `107.191.43.73` to see the dashboard and data sourced by Elasticsearch.
* Requires **authorization**.

### Elasticsearch
* Running on `107.191.43.73:92`.
* Requires **authorization**: `user:pass@107.191.43.73:92`
  * Use same credentials for Kibana.
* Index: `users`
* To get all documents stored in `users`, make a `GET` request in Postman: `http://<user>:<pass>@107.191.43.73:9200/users/_search?pretty=true&q=*:*`

### Redis
* Running on `64.52.162.153:6379`.
* Requires **authorization**.

## Developing Stateful Services
#### 1. Create a virtual environment. 
`nodeenv venv`
#### 2. Activate the virtual environment.
`source venv/bin/activate`
  * To deactivate: `deactivate_node`
#### 3. Create a file for database operations.
`touch database.js`
#### 4. Copy and paste the following at the top of the file.
  ``` node.js
  /* library imports */
  const elasticsearch = require('elasticsearch');

  /* client to communicate with elasticsearch */
  const client = new elasticsearch.Client({
      host: "http://<user>:<pass>@107.191.43.73:92"
  });
  
  /* index where user account information will be stored */
  const INDEX = "users";
  ```
  
  ## To-do
  * Add lowercase analyzer for username fields for indices, `user`, `questions`, and `answers` so we can exact match them without case sensitivity.
    ```
    "settings": {
       "analysis": {
          "analyzer": {
             "lowercase": {
               "type": "custom",
               "tokenizer": "standard",
               "filter": [
                  "lowercase"
               ]
             }
          }
       }
    }
    ```
    * Edit the `keyword` field for the username fields (`username.keyword`) to include `analyzer: lowercase`.
    * Change all `term` queries for `username` to `match` queries.
  * Add query search functionality for `/search` endpoint (read API for more details). 
  * Refactor code base since it got messy at the end (remove debug statements).
  * Create ansible scripts to easily setup NodeJS microservices, load balancers and other useful instances.
  * Make a minimal frontend for now using Angular.
  * ~Setup mail server to send verification emails.~
  * ~Add `/send_email` endpoint which will be called by registration service in `/adduser`.~
  * ~~Develop a `search` microservice.~~
  * ~~Develop the rest of the API in a separate microservice, `qa-service`.~~
  * Deploy microservices on separate instances.
  * ~Find a way to call all endpoints on only one IP so that grading will work.~
  * ~Extensively test each endpoint with fake data.~
