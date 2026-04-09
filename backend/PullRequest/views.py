from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from repositories.permissions import IsMaintainer, IsRepositoryAdmin, IsRepositoryMember
from repositories.models import Repository
from branches.models import Branches, Commit
from .models import PullRequest, Review
from .serializers import PullRequestSerializer, ReviewSerializer
from django.db import transaction
from storage.services.diff_services import generate_diff
from config.access.services import get_repo_membership, get_repo_role
from config.access.constants import REPO_ADMIN, REPO_MAINTAINER, REPO_MEMBER
from config.events.dispatcher import dispatch_event
from config.events.event_types import PR_CREATED, PR_COMMENTED, PR_REVIEWED
from storage.models import TreeNode
from rest_framework.permissions import IsAuthenticated


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

        from .tasks import trigger_diff_generation
        trigger_diff_generation(serializer.instance.id)

        dispatch_event(
            PR_CREATED,
            {
                "actor": self.request.user,
                "pr": serializer.instance
            }
        )

    @action(detail=True, methods=['post'])
    def merge(self, request, **kwargs):

        with transaction.atomic():
            pr = self.get_object()
        
            if pr.status != "OPEN":
                return Response({'error': f'Cannot merge a {pr.status.lower()} pull request'}, status=status.HTTP_400_BAD_REQUEST)

            if pr.source_branch_deleted or pr.target_branch_deleted:
                return Response({'error': 'Source or target branch has been deleted'}, status=status.HTTP_400_BAD_REQUEST)

            if pr.base_commit != pr.target_branch.head_commit:
                return Response({'error': 'Target branch has changed. Please rebase.'}, status=status.HTTP_400_BAD_REQUEST)

            if pr.has_conflicts:
                return Response({'error': 'Conflicts detected: Target branch has moved since PR creation'}, status=status.HTTP_400_BAD_REQUEST)

            if not pr.source_branch.head_commit:
                return Response({'error': 'Source branch has no commits'}, status=400)

            latest_commit_id = pr.source_branch.head_commit.id

            reviews = pr.reviews.filter(commit=latest_commit_id)

            approvals = reviews.filter(status="APPROVED").count()
            has_changes_requested = reviews.filter(status="CHANGES_REQUESTED").exists()
        
            if has_changes_requested:
                return Response({'error': 'Cannot merge: There are active changes requested'}, status=status.HTTP_400_BAD_REQUEST)
        
            if pr.target_branch.is_protected and approvals < 1:
                return Response({'error': 'Cannot merge: At least one approval is required for protected branches'}, status=status.HTTP_400_BAD_REQUEST)

            merged_snapshot = {
                **pr.base_commit.snapshot,
                **pr.source_branch.head_commit.snapshot
            }
            merge_commit = Commit.objects.create(
                repository=pr.repo,
                branch=pr.target_branch,
                parent=pr.target_branch.head_commit,
                second_parent=pr.source_branch.head_commit,
                message=f"Merge pull request #{pr.id} from {pr.source_name}",
                author=request.user,
                snapshot=merged_snapshot
            )
            
            from storage.services.tree_services import build_tree_from_snapshots
            build_tree_from_snapshots(merge_commit, merge_commit.snapshot)

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
            
        # Refresh the PR state by wiping old reviews when re-initiated
        pr.reviews.all().delete()
        
        pr.save()

        from .tasks import trigger_diff_generation
        trigger_diff_generation(pr.id)

        return Response({'status': 'reopened'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def diff(self, request, pk=None, **kwargs):

        pr = self.get_object()

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        if pr.diff_status == "PROCESSING":
            if pr.precomputed_diff:
                # Return stale data instead of blocking
                return Response({
                    "status": "stale",
                    "count": len(pr.precomputed_diff),
                    "page": page,
                    "page_size": page_size,
                    "results": pr.precomputed_diff[start_idx:end_idx]
                }, status=status.HTTP_200_OK)
            else:
                return Response({"status": "processing", "message": "Diff is currently being generated."}, status=status.HTTP_202_ACCEPTED)

        if pr.diff_status == "FAILED":
            return Response({'error': 'Failed to precompute diff. Please try again or re-trigger.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not pr.precomputed_diff:
            from .tasks import trigger_diff_generation
            trigger_diff_generation(pr.id)
            return Response({"status": "processing", "message": "Diff calculation started. Check back shortly."}, status=status.HTTP_202_ACCEPTED)

        response = pr.precomputed_diff
        paginated_response = response[start_idx:end_idx]

        return Response({
            "status": "fresh",
            "count": len(response),
            "page": page,
            "page_size": page_size,
            "results": paginated_response
        }, status=status.HTTP_200_OK)


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

        current_commit_id = pull_request.source_branch.head_commit.id if pull_request.source_branch.head_commit else None
        Review.objects.filter(
            pr=pull_request,
            reviewer=reviewer,
            commit=current_commit_id
        ).delete()

        review_instance = serializer.save(reviewer=reviewer, pr=pull_request)
        review_instance.commit = current_commit_id
        review_instance.save()