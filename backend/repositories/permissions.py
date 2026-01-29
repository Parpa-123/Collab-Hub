from rest_framework.permissions import BasePermission
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

