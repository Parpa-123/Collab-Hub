import json
import hashlib

def add_file(file : str):

    with open(file, "rb") as f:
        content = f.read()

    file_hash = hashlib.sha1(content).hexdigest()

    with open(".ghlite/index.json", "r") as f:
        index = json.load(f)
    
    index[file] = file_hash

    with open(".ghlite/index.json", "w") as f:
        json.dump(index, f, indent=2)
    
    print(f"Added {file}")

    