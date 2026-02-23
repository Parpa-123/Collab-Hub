from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from repositories.permissions import IsMaintainer, IsRepositoryAdmin, IsRepositoryMember
from repositories.models import Repository
from .models import PullRequest, Review
from .serializers import PullRequestSerializer, ReviewSerializer


class PullRequestPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if view.action in ['list', 'retrieve', 'create']:
            return IsRepositoryMember().has_permission(request, view)
        if view.action in ['destroy', 'merge']:
            return IsRepositoryAdmin().has_permission(request, view) or \
                   IsMaintainer().has_permission(request, view)
        return False

    def has_object_permission(self, request, view, obj):
        if view.action in ['destroy', 'merge']:
            return IsRepositoryAdmin().has_permission(request, view) or \
                   IsMaintainer().has_permission(request, view)
        return IsRepositoryMember().has_permission(request, view)


class PullRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PullRequestSerializer
    permission_classes = [PullRequestPermission]

    def get_queryset(self):
        return PullRequest.objects.filter(repo__slug=self.kwargs.get('slug'))

    def get_object(self):
        return PullRequest.objects.get(
            repo__slug=self.kwargs.get('slug'), pk=self.kwargs.get('pk')
        )

    def perform_create(self, serializer):
        repo = Repository.objects.get(slug=self.kwargs.get('slug'))
        serializer.save(created_by=self.request.user, repo=repo)

    @action(detail=True, methods=['post'])
    def merge(self, request, **kwargs):
        pull_request = self.get_object()
        if pull_request.can_merge:
            pull_request.status = 'MERGED'
            pull_request.merged_by = request.user
            pull_request.merged_at = timezone.now()
            pull_request.save()
            return Response({'status': 'merged'}, status=status.HTTP_200_OK)
        return Response({'status': 'cannot merge'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def close(self, request, **kwargs):
        pull_request = self.get_object()
        if pull_request.can_close:
            pull_request.status = 'CLOSED'
            pull_request.closed_at = timezone.now()
            pull_request.save()
            return Response({'status': 'closed'}, status=status.HTTP_200_OK)
        return Response({'status': 'cannot close'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reopen(self, request, **kwargs):
        pull_request = self.get_object()
        if pull_request.can_reopen:
            pull_request.status = 'OPEN'
            pull_request.save()
            return Response({'status': 'reopened'}, status=status.HTTP_200_OK)
        return Response({'status': 'cannot reopen'}, status=status.HTTP_400_BAD_REQUEST)


class ReviewPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if view.action in ['list', 'retrieve', 'create']:
            return IsRepositoryMember().has_permission(request, view)
        if view.action in ['destroy', 'merge']:
            return IsRepositoryAdmin().has_permission(request, view) or \
                   IsMaintainer().has_permission(request, view)
        return False

    def has_object_permission(self, request, view, obj):
        if view.action in ['destroy', 'merge']:
            return IsRepositoryAdmin().has_permission(request, view) or \
                   IsMaintainer().has_permission(request, view)
        return IsRepositoryMember().has_permission(request, view)

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [ReviewPermission]

    def get_queryset(self):
        return Review.objects.filter(
            pr__repo__slug=self.kwargs.get('slug'),
            pr__pk=self.kwargs.get('pr_pk')
        )

    def get_object(self):
        return Review.objects.get(
            pr__repo__slug=self.kwargs.get('slug'),
            pr__pk=self.kwargs.get('pr_pk'),
            pk=self.kwargs.get('pk')
        )

    
    @action(detail=True, methods=['post'])
    def approve(self, request, **kwargs):
        review = self.get_object()
        if review.can_approve:
            review.status = 'APPROVED'
            review.save()
            return Response({'status': 'approved'}, status=status.HTTP_200_OK)
        return Response({'status': 'cannot approve'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def changes_requested(self, request, **kwargs):
        review = self.get_object()
        if review.can_approve:
            review.status = 'CHANGES_REQUESTED'
            review.save()
            return Response({'status': 'changes requested'}, status=status.HTTP_200_OK)
        return Response({'status': 'cannot request changes'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def comment(self, request, **kwargs):
        review = self.get_object()
        if review.can_approve:
            review.status = 'COMMENTED'
            review.save()
            return Response({'status': 'commented'}, status=status.HTTP_200_OK)
        return Response({'status': 'cannot comment'}, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        pull_request = PullRequest.objects.get(repo__slug=self.kwargs.get('slug'), pk=self.kwargs.get('pr_pk'))
        serializer.save(reviewer=self.request.user, pr=pull_request)
