<h1 align=center>stackoverflow-clone</h1>
<p align=center>A minimal clone of StackOverflow built for our Cloud Computing course.</p>

## Kibana
* Visit `107.191.43.73` to see the dashboard and data sourced by Elasticsearch.

## Elasticsearch
* Running on `107.191.43.73:9200`.
* Index: `users`
* To get all documents stored in `users`, make a `GET` request in Postman: `http://107.191.43.73:9200/users/_search?pretty=true&q=*:*`

## Developing Stateful Services
#### 1. Create a virtual environment. 
`nodeenv venv`
#### 2. Activate the virtual environment.
`source venv/bin/activate`
  * To deactivate: `deactivate_node`
#### 3. Create a file for database operations.
`touch database.js`
#### 4. Copy and paste the following at the top of the file
  ``` node.js
  /* library imports */
  const elasticsearch = require('elasticsearch');

  /* client to communicate with elasticsearch */
  const client = new elasticsearch.Client({
      host: "107.191.43.73:9200"
  });
  
  /* index where user account information will be stored */
  const INDEX = "users";
  ```
