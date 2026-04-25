from rest_framework.generics import ListAPIView
from django.contrib.contenttypes.prefetch import GenericPrefetch
from .models import Activity
from .serializers import ActivitySerializer
from .pagination import ActivityPagination
from PullRequest.models import PullRequest, Review
from issues.models import Issue


class ActivityListView(ListAPIView):
    
    serializer_class = ActivitySerializer
    pagination_class = ActivityPagination
    
    def get_queryset(self):
        repo_id = self.kwargs.get("repo_id")
        return Activity.objects.filter(repo_id=repo_id).select_related(
            'actor', 'repo', 'content_type'
        ).prefetch_related(
            GenericPrefetch('content_object', [
                PullRequest.objects.all(),
                Review.objects.all(),
                Issue.objects.all(),
            ])
        ).order_by('-created_at')
    