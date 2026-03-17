import requests

BASE_URL = "http://localhost:8000/api"

def push_commit(repo_id, commit):

    return requests.post(
        f"{BASE_URL}/repos/{repo_id}/push/",
        json=commit
    )

def get_commits(repo_id):
    res = requests.get(f"{BASE_URL}/repos/{repo_id}/commits/")
    
    if res.status_code != 200:
        print("Error fetching commits")
        return
    
    return res.json()