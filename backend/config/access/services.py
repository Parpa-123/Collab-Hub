
def repo_membership(user, repo):
    return next(
        (m for m in repo.repositoryMembers if m.developer == user),
        None
    )

def get_repo_role(user, repo):
    m = repo_membership(user, repo)
    return m.role if m else None