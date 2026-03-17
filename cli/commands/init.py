import os
import json

def init_repo():
    if os.path.exists(".ghlite"):
        print("Repository exists")
        return
    
    os.makedirs(".ghlite/objects", exist_ok=True)

    with open(".ghlite/index.json", "w") as f :
        json.dump({},f)
    
    with open(".ghlite/HEAD", "w") as f :
        f.write("main")
    
    with open(".ghlite/config.json", "w") as f:
        json.dump({"repo_id" : None}, f)
    
    print("Initialized empty ghlite repository")