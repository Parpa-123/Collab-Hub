# comments/utils.py


def resolve_repository(obj):
    """
    Given a content_object (e.g. an Issue, PullRequest, or Branch),
    return its associated Repository.

    Falls back through common field names: 'repo', 'repository'.
    Returns None if no repository can be resolved.
    """
    return getattr(obj, "repo", None) or getattr(obj, "repository", None)
