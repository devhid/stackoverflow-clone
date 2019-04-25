import json
import requests

file = "stackoverflow-data-idf.json"

headers = {
    'Content-Type': "application/json",
    'cache-control': "no-cache",
    'Postman-Token': "d2983f03-96f9-4eb6-b312-711f81ec1687"
}

cookies = {"soc_login": "s%3AkAqalE7qn2AhKQv7G52jmWs0TPmSBtzu.dM53WyX%2FGUp1%2BBGn1GR5emGFkh2xnn9%2FXzPVcXyuRAA"}

with open(file) as fd:
    i = 0
    for line in fd:
        if i == 100: break
        jso = json.loads(line)
        question = {
            "title": jso['title'],
            "body": jso['body'],
            "tags": jso['tags'].split('|')
        }

        requests.post('http://kellogs.cse356.compas.cs.stonybrook.edu/questions/add', json=question, headers=headers, cookies=cookies)
        i += 1

        