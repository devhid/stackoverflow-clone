import json
import requests

headers = {
    'Content-Type': "application/json",
    'cache-control': "no-cache"
}


for i in range(1000):
    response = requests.post('http://130.245.168.36/questions/add', json={}, headers=headers)
    
    print(response)