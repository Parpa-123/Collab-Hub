from .constants import REPO_ADMIN, LEAVE_REPO, DELETE_REPO


def check_last_owner(repo,user,action):
    if action in [LEAVE_REPO]:
        admins = repo.repositoryMembers.filter(role=REPO_ADMIN)
        if len(admins) == 1 and admins[0].developer == user:
            return False, "Repository must have at least one owner."
    return True, None


def delete_repo(repo,user,action):
    if action in [DELETE_REPO]:
        if repo.owner != user:
            return False, "You are not the owner of this repository."
    return True, None