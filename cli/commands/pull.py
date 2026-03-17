import os
import json
from api import get_commits

def pull(repo_id : int):

    commit = get_commits(repo_id)

    if not commit:
        print("No commits found")
        return
    
    latest_commit = commit[-2]

    files = latest_commit["files"]

    for file, hash in files.items():

        os.makedirs(os.path.dirname(file), exist_ok=True)

        
        
        with open(file, "w") as f:
            f.write(content)

    os.makedirs(".ghlite/objects", exist_ok=True)

    with open(f".ghlite/objects/{latest_commit['hash']}", "w") as f:
        json.dump(latest_commit, f)
    
    print("Pulled commit": latest_commit['hash'])
    