from rest_framework.permissions import BasePermission
from .models import RepositoryMember, Repository


def get_repo_member(user, repo):
    if not user.is_authenticated or not user:
        return None
    return RepositoryMember.objects.filter(developer=user, repository=repo).first()


class IsRepositoryMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        return get_repo_member(request.user, obj) is not None

class IsRepositoryOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        member = get_repo_member(request.user, obj)
        return member and member.role == RepositoryMember.role.OWNER

class IsMaintainer(BasePermission):
    def has_object_permission(self, request, view, obj):
        member = get_repo_member(request.user, obj)
        return member and member.role in [RepositoryMember.role.MAINTAINER, RepositoryMember.role.OWNER]

class CanWrite(BasePermission):
    def has_object_permission(self, request, view, obj):
        member = get_repo_member(request.user, obj)
        return member is not None

