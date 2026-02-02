from repositories.models import RepositoryMember
from .permissions import has_permission


def get_repo_membership(user, repo):
    """Get the repository membership for a user."""
    if not user or not user.is_authenticated:
        return None
    return RepositoryMember.objects.filter(developer=user, repository=repo).first()


def get_repo_role(user, repo):
    """Get the user's role in a repository."""
    membership = get_repo_membership(user, repo)
    return membership.role if membership else None


def can_perform_action(user, repo, action):
    """Check if a user can perform a specific action on a repository."""
    role = get_repo_role(user, repo)
    if not role:
        return False
    return has_permission(role, action)