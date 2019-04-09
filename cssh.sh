#!/usr/local/bin/python3
import sys
import subprocess

user = "root"

instances = {
    "redis": "64.52.162.153",
    "auth": "64.190.90.243",
    "search": "64.190.91.125",
    "qa": "140.82.9.197",
    "registration": "130.245.171.197",
    "email-verification": "207.148.20.88",
    "felk": "107.191.43.73",
    "routing": "8.9.11.218"
}

if len(sys.argv) != 2 and len(sys.argv) != 4:
    print("Invalid arguments. Usage: ./cssh.sh list|<hostname> [-u <user>]")
    exit(1)

if sys.argv[1] == "list":
    for key in instances.keys():
        print("{key}: {ip}".format(key=key, ip=instances[key]))
    exit(0)

hostname = sys.argv[1]

if len(sys.argv) == 4:
    flag = sys.argv[2]
    if flag != "-u":
        print("Invalid flag, '{flag}'. Usage: ./cssh.sh list|<hostname> [-u <user>]".format(flag=flag))
        exit(1)
    
    user = sys.argv[3]

if hostname not in instances:
    print("Invalid hostname. Possible hostnames: {instances}".format(instances=list(instances.keys())))
    exit(1)

cmd = "ssh -i ~/.ssh/id_rsa {user}@{instance}".format(user=user, instance=instances[hostname])

subprocess.run(cmd.split())