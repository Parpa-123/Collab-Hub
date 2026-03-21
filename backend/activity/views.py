from rest_framework.generics import ListAPIView
from .models import Activity
from .serializers import ActivitySerializer
from .pagination import ActivityPagination


class ActivityListView(ListAPIView):
    
    serializer_class = ActivitySerializer
    pagination_class = ActivityPagination
    
    def get_queryset(self):
        repo_id = self.kwargs.get("repo_id")
        return Activity.objects.filter(repo_id=repo_id).select_related('actor','repo').order_by('-created_at')
    