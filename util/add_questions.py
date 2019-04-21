import json
import requests

file = "stackoverflow-data-idf.json"

headers = {
    'Content-Type': "application/json",
    'cache-control': "no-cache",
    'Postman-Token': "b4e11362-94a9-4bab-99cc-85b6393b4383"
}

cookies = {"soc_login": "s%3Az-EkE9FVurEpBVdabOZCBOXH-JkdAhsl.HWYNcwQ6bWsBvUs%2BjndWbx2FbVZXVf%2BruG7jn%2B8xZGs"}

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

        