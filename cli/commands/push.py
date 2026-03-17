import os
import json
from api import push_commit

def push_changes(repo_id : int):
    objects = os.listdir('.ghlite/objects')

    if not objects:
        print("No objects to push")
        return
    
    latest = objects[-1]

    with open(f'.ghlite/objects/{latest}', 'r') as f:
        commit = json.load(f)
    
    res = push_commit(repo_id, commit)
    
    print(res.json())