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

        verify = {
            "email": info[1],
            "key": "abracadabra"
        }
        
        requests.post('http://kellogs.cse356.compas.cs.stonybrook.edu/verify/', json=verify, headers=headers)