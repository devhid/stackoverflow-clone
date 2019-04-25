import json
import requests

file = "users.csv"

headers = {
    'Content-Type': "application/json",
    'cache-control': "no-cache"
}

with open(file) as fd:
    for line in fd:
        info = line.split(',')

        user = {
            "email": info[1],
            "username": info[0],
            "password": info[2][:-1]
        }
        
        response = requests.post('http://130.245.171.197/adduser', json=user, headers=headers)