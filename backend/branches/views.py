from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from .models import Branches, Commit
from .serializers import BranchesSerializer, CommitSerializer
from repositories.models import Repository
from config.access.services import can_perform_action, get_repo_membership
from config.access.constants import CREATE_BRANCH, DELETE_BRANCH
from storage.services.blob_service import get_or_create_blob


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
            return get_repo_membership(request.user, repository) is not None
        
        if request.method == 'POST':
            return can_perform_action(request.user, repository, CREATE_BRANCH)
            
        if request.method in ['DELETE', 'PUT', 'PATCH']:
            return get_repo_membership(request.user, repository) is not None
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Check permission for retrieve/update/delete actions."""
        repository = obj.repository
        
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
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


class IsRepoMember(BasePermission):
    """Checks that the authenticated user is a member of the repository."""

    def has_permission(self, request, view):
        slug = view.kwargs.get('slug')
        try:
            repository = Repository.objects.get(slug=slug)
        except Repository.DoesNotExist:
            return False
        return get_repo_membership(request.user, repository) is not None


class CommitViewSet(viewsets.ModelViewSet):
    """ViewSet for listing, creating, and retrieving commits on a branch."""

    serializer_class = CommitSerializer
    permission_classes = [IsAuthenticated, IsRepoMember]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return Commit.objects.filter(
            repository__slug=self.kwargs['slug'],
            branch__pk=self.kwargs['branch_pk'],
        )

    def perform_create(self, serializer):
        repo = Repository.objects.get(slug=self.kwargs['slug'])
        branch = Branches.objects.get(
            pk=self.kwargs['branch_pk'],
            repository=repo,
        )

        snapshot = serializer.validated_data.get('snapshot')
        if snapshot:
            new_snapshot = {}
            for path, content in snapshot.items():
                blob = get_or_create_blob(content)
                new_snapshot[path] = str(blob.id)
            serializer.validated_data['snapshot'] = new_snapshot

        commit = serializer.save(
            author=self.request.user,
            repository=repo,
            branch=branch,
        )

        from storage.services.tree_service import build_tree_from_snapshot
        build_tree_from_snapshot(commit, commit.snapshot)

