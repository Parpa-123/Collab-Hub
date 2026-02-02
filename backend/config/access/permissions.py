from .constants import *

GLOBAL_PERMISSIONS = {
    "AUTHENTICATED" : {
        CREATE_REPO,
        
    }
}

REPO_ROLE_PERMISSIONS = {
    REPO_ADMIN : {
        DELETE_REPO,
        UPDATE_REPO,
        MERGE_PR,
        REMOVE_USER,
        LEAVE_REPO,
        INVITE_USER,
        CREATE_PR,
        CREATE_ISSUE,
        CLOSE_ISSUE,
        COMMENT,
        CREATE_BRANCH,
        DELETE_BRANCH,
        PROTECT_BRANCH,
    },

    REPO_MAINTAINER:{
        UPDATE_REPO,
        MERGE_PR,
        INVITE_USER,
        CREATE_PR,
        CREATE_ISSUE,
        CLOSE_ISSUE,
        COMMENT,
        CREATE_BRANCH,
        DELETE_BRANCH,
    },
    REPO_MEMBER:{
        CREATE_ISSUE,
        CREATE_PR,
        COMMENT,
        CREATE_BRANCH,
    },
    REPO_VIEWER:{
        COMMENT
    }
}


def has_permission(role, action):
    """Check if a role has permission to perform an action."""
    if role not in REPO_ROLE_PERMISSIONS:
        return False
    return action in REPO_ROLE_PERMISSIONS.get(role, set())
