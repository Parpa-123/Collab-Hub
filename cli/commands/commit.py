import json
import hashlib
import time
import os

def commit_changes(messages : str):
    with open(".ghlite/index.json") as f:
        index = json.load(f)

    commit = {
        "message" : messages,
        "files" : index,
        "timestamp" : time.time()
    }

    commit_str = json.dumps(commit)

    commit_hash = hashlib.sha1(commit_str.encode()).hexdigest()

    os.makedirs(".ghlite/objects", exist_ok=True)

    with open(f".ghlite/objects/{commit_hash}", "w") as f:
        f.write(commit_str)
    
    print(f"Committed {commit_hash}")