from .constants import *

GLOBAL_PERMISSIONS = {
    "AUTHENTICATED" : {
        CREATE_REPO,
        
    }
}

REPO_ROLE_PERMISSIONS = {
    REPO_OWNER : {
        DELETE_REPO,
        UPDATE_REPO,
        MERGE_PR,
        REMOVE_USER,
        LEAVE_REPO,
        INVITE_USER,
        CREATE_PR,
        CREATE_ISSUE,
        CLOSE_ISSUE,
        COMMENT
    },

    REPO_MAINTAINER:{
        UPDATE_REPO,
        MERGE_PR,
        INVITE_USER,
        CREATE_PR,
        CREATE_ISSUE,
        CLOSE_ISSUE,
        COMMENT
    },
    REPO_MEMBER:{
        CREATE_ISSUE,
        CREATE_PR,
        COMMENT
    },
    REPO_VIEWER:{
        COMMENT
    }
}