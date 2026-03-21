from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from repositories.permissions import IsMaintainer, IsRepositoryAdmin, IsRepositoryMember
from repositories.models import Repository
from branches.models import Branches, Commit
from .models import PullRequest, Review
from .serializers import PullRequestSerializer, ReviewSerializer
from django.db import transaction
from .services.diff_service import generate_diff
from config.access.services import get_repo_membership, get_repo_role
from config.access.constants import REPO_ADMIN, REPO_MAINTAINER, REPO_MEMBER
from config.events.dispatcher import dispatch_event
from config.events.event_types import PR_CREATED, PR_COMMENTED, PR_REVIEWED


class PullRequestHardenedPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        slug = view.kwargs.get('slug')
        try:
            repository = Repository.objects.get(slug=slug)
        except Repository.DoesNotExist:
            return False
        
        role = get_repo_role(request.user, repository)
        if not role:
            return False

        if view.action in ['list', 'retrieve', 'create']:
            return True

        return True

    def has_object_permission(self, request, view, obj):
        role = get_repo_role(request.user, obj.repo)
        
        if view.action in ['merge', 'approve', 'changes_requested']:
            if role not in [REPO_ADMIN, REPO_MAINTAINER]:
                return False
            if view.action == 'merge' and obj.target_branch.is_protected:
                return role == REPO_ADMIN
            return True

        if view.action in ['close', 'reopen']:
            if obj.created_by == request.user:
                return True
            return role in [REPO_ADMIN, REPO_MAINTAINER]

        return role in [REPO_ADMIN, REPO_MAINTAINER, REPO_MEMBER]


class PullRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PullRequestSerializer
    permission_classes = [permissions.IsAuthenticated, PullRequestHardenedPermission]

    def get_queryset(self):
        return PullRequest.objects.filter(repo__slug=self.kwargs.get('slug'))

    def get_object(self):
        obj = PullRequest.objects.get(
            repo__slug=self.kwargs.get('slug'), pk=self.kwargs.get('pk')
        )
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        repo = Repository.objects.get(slug=self.kwargs.get('slug'))
        target_branch = serializer.validated_data.get('target_branch')
        source_branch = serializer.validated_data.get('source_branch')
        
        if PullRequest.objects.filter(repo=repo, source_branch=source_branch, target_branch=target_branch, status="OPEN").exists():
            raise ValidationError({"error": ["An open pull request already exists for these branches."]})

        base_commit = target_branch.head_commit if target_branch else None
        serializer.save(created_by=self.request.user, repo=repo, base_commit=base_commit)
        dispatch_event(
            PR_CREATED,
            {
                "actor": self.request.user,
                "pr": serializer.instance
            }
        )

    @action(detail=True, methods=['post'])
    def merge(self, request, **kwargs):
        pr = self.get_object()
        
        if pr.status != "OPEN":
            return Response({'error': f'Cannot merge a {pr.status.lower()} pull request'}, status=status.HTTP_400_BAD_REQUEST)

        if pr.source_branch_deleted or pr.target_branch_deleted:
            return Response({'error': 'Source or target branch has been deleted'}, status=status.HTTP_400_BAD_REQUEST)

        if pr.has_conflicts:
            return Response({'error': 'Conflicts detected: Target branch has moved since PR creation'}, status=status.HTTP_400_BAD_REQUEST)

        approvals = pr.reviews.filter(status="APPROVED").count()
        has_changes_requested = pr.reviews.filter(status="CHANGES_REQUESTED").exists()
        
        if has_changes_requested:
            return Response({'error': 'Cannot merge: There are active changes requested'}, status=status.HTTP_400_BAD_REQUEST)
        
        if approvals < 1:
            return Response({'error': 'Cannot merge: At least one approval is required'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            merge_commit = Commit.objects.create(
                repository=pr.repo,
                branch=pr.target_branch,
                parent=pr.target_branch.head_commit,
                second_parent=pr.source_branch.head_commit,
                message=f"Merge pull request #{pr.id} from {pr.source_name}",
                author=request.user
            )
            pr.target_branch.head_commit = merge_commit
            pr.target_branch.save()
            
            pr.status = 'MERGED'
            pr.merged_at = timezone.now()
            pr.merged_by = request.user
            pr.save()
            return Response({'status': 'merged'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def close(self, request, **kwargs):
        pr = self.get_object()
        if pr.status == "CLOSED":
            return Response({'error': 'Pull request is already closed'}, status=status.HTTP_400_BAD_REQUEST)
        if pr.status == "MERGED":
            return Response({'error': 'Cannot close a merged pull request'}, status=status.HTTP_400_BAD_REQUEST)
            
        pr.status = 'CLOSED'
        pr.closed_at = timezone.now()
        pr.save()
        return Response({'status': 'closed'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reopen(self, request, **kwargs):
        pr = self.get_object()
        if pr.status == "OPEN":
            return Response({'error': 'Pull request is already open'}, status=status.HTTP_400_BAD_REQUEST)
        if pr.status == "MERGED":
            return Response({'error': 'Cannot reopen a merged pull request'}, status=status.HTTP_400_BAD_REQUEST)
            
        pr.status = 'OPEN'
        pr.closed_at = None
        if pr.target_branch and pr.target_branch.head_commit:
            pr.base_commit = pr.target_branch.head_commit
        pr.save()
        return Response({'status': 'reopened'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def diff(self, request, pk=None):

        pr = self.get_object()
        if not pr.base_commit or not pr.source_branch.head_commit:
            return Response({'error': 'Cannot generate diff for pull request without base and source commits'}, status=status.HTTP_400_BAD_REQUEST)
        
        diff = generate_diff(pr.base_commit, pr.source_branch.head_commit)
        return Response(diff, status=status.HTTP_200_OK)


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated, PullRequestHardenedPermission]

    def get_queryset(self):
        return Review.objects.filter(
            pr__repo__slug=self.kwargs.get('slug'),
            pr__pk=self.kwargs.get('pr_pk')
        )

    def get_object(self):
        obj = Review.objects.get(
            pr__repo__slug=self.kwargs.get('slug'),
            pr__pk=self.kwargs.get('pr_pk'),
            pk=self.kwargs.get('pk')
        )
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=['post'])
    def approve(self, request, **kwargs):
        review = self.get_object()
        if review.pr.status != 'OPEN':
            return Response({'error': f'Cannot approve a {review.pr.status.lower()} pull request'}, status=status.HTTP_400_BAD_REQUEST)
        if review.reviewer == review.pr.created_by:
            return Response({'error': 'Authors cannot approve their own pull requests'}, status=status.HTTP_403_FORBIDDEN)
        
        if review.status == 'APPROVED':
            return Response({'error': 'Review is already approved'}, status=status.HTTP_400_BAD_REQUEST)

        review.status = 'APPROVED'
        review.save()
        dispatch_event(PR_REVIEWED, {
            "actor": request.user,
            "review": review
        })
        return Response({'status': 'approved'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def changes_requested(self, request, **kwargs):
        review = self.get_object()
        if review.pr.status != 'OPEN':
            return Response({'error': f'Cannot request changes on a {review.pr.status.lower()} pull request'}, status=status.HTTP_400_BAD_REQUEST)
        if review.reviewer == review.pr.created_by:
            return Response({'error': 'Authors cannot request changes on their own pull requests'}, status=status.HTTP_403_FORBIDDEN)
        
        if review.status == 'CHANGES_REQUESTED':
            return Response({'error': 'Changes are already requested in this review'}, status=status.HTTP_400_BAD_REQUEST)

        review.status = 'CHANGES_REQUESTED'
        review.save()
        dispatch_event(PR_REVIEWED, {
            "actor": request.user,
            "review": review
        })
        return Response({'status': 'changes requested'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def comment(self, request, **kwargs):
        review = self.get_object()
        if review.pr.status != 'OPEN':
            return Response({'error': f'Cannot comment on a {review.pr.status.lower()} pull request'}, status=status.HTTP_400_BAD_REQUEST)
        
        review.status = 'COMMENTED'
        review.save()
        dispatch_event(PR_COMMENTED, {
            "actor": request.user,
            "review": review
        })
        return Response({'status': 'commented'}, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        pull_request = PullRequest.objects.get(repo__slug=self.kwargs.get('slug'), pk=self.kwargs.get('pr_pk'))
        reviewer = self.request.user

        if pull_request.status != "OPEN":
            raise ValidationError({"error": "Pull request must be open to review."})

        if reviewer == pull_request.created_by:
            raise ValidationError({"error": "You cannot review your own pull request."})

        if not pull_request.repo.repositoryMembers.filter(developer=reviewer).exists():
            raise ValidationError({"error": "You are not a member of this repository."})

        if pull_request.source_branch_deleted or pull_request.target_branch_deleted:
            raise ValidationError({"error": "Pull request must have both source and target branches."})

        serializer.save(reviewer=reviewer, pr=pull_request)
