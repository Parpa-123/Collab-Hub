from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from .models import Branches
from .serializers import BranchesSerializer
from repositories.models import Repository
from config.access.services import can_perform_action
from config.access.constants import CREATE_BRANCH, DELETE_BRANCH


class CanManageBranches(BasePermission):
    """Permission class that uses config/access system for branch operations."""
    
    def has_permission(self, request, view):
        """Check permission for list/create actions."""
        slug = view.kwargs.get('slug')
        try:
            repository = Repository.objects.get(slug=slug)
        except Repository.DoesNotExist:
            return False
        
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            from config.access.services import get_repo_membership
            return get_repo_membership(request.user, repository) is not None
        
        if request.method == 'POST':
            return can_perform_action(request.user, repository, CREATE_BRANCH)
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Check permission for retrieve/update/delete actions."""
        repository = obj.repository
        
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            from config.access.services import get_repo_membership
            return get_repo_membership(request.user, repository) is not None
        
        if request.method == 'DELETE':
            return can_perform_action(request.user, repository, DELETE_BRANCH)
        
        if request.method in ['PUT', 'PATCH']:
            return can_perform_action(request.user, repository, CREATE_BRANCH)
        
        return False


class BranchesViewSet(viewsets.ModelViewSet):
    serializer_class = BranchesSerializer
    permission_classes = [IsAuthenticated, CanManageBranches]

    def get_queryset(self):
        return Branches.objects.filter(repository__slug=self.kwargs['slug'])

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['repository'] = self.kwargs.get('slug')
        return context
