from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import RepositoryMember, Repository


def get_repo_member(user, repo):
    if not user.is_authenticated or not user:
        return None
    return RepositoryMember.objects.filter(developer=user, repository=repo).first()


class IsRepositoryMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        return get_repo_member(request.user, obj) is not None

class IsRepositoryAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        member = get_repo_member(request.user, obj)
        return member and member.role == RepositoryMember.Role.REPO_ADMIN

class IsMaintainer(BasePermission):
    def has_object_permission(self, request, view, obj):
        member = get_repo_member(request.user, obj)
        return member and member.role in [RepositoryMember.Role.MAINTAINER, RepositoryMember.Role.REPO_ADMIN]

class CanWrite(BasePermission):
    def has_object_permission(self, request, view, obj):
        member = get_repo_member(request.user, obj)
        return member is not None

class IsPublicOrRepositoryMember(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            if hasattr(obj, 'visibility') and obj.visibility == Repository.Visibility.PUBLIC:
                return True
            if hasattr(obj, 'repository') and obj.repository.visibility == Repository.Visibility.PUBLIC:
                return True
        return get_repo_member(request.user, getattr(obj, 'repository', obj)) is not None
