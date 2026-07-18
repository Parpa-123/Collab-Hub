from django.urls import path
from .views import PullRequestViewSet, ReviewViewSet

urlpatterns = [
    path('', PullRequestViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<int:pk>/', PullRequestViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    path('<int:pk>/merge/', PullRequestViewSet.as_view({'post': 'merge'})),
    path('<int:pk>/close/', PullRequestViewSet.as_view({'post': 'close'})),
    path('<int:pk>/reopen/', PullRequestViewSet.as_view({'post': 'reopen'})),
    path('<int:pk>/ready-for-review/', PullRequestViewSet.as_view({'post': 'ready_for_review'})),
    path('<int:pk>/convert-to-draft/', PullRequestViewSet.as_view({'post': 'convert_to_draft'})),

    # Review routes (nested under a specific PR)
    path('<int:pk>/diff/', PullRequestViewSet.as_view({'get': 'diff'})),
    path('<int:pk>/viewed-files/', PullRequestViewSet.as_view({'get': 'viewed_files', 'patch': 'viewed_files'})),
    path('<int:pr_pk>/reviews/', ReviewViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<int:pr_pk>/reviews/<int:pk>/', ReviewViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    path('<int:pr_pk>/reviews/<int:pk>/approve/', ReviewViewSet.as_view({'post': 'approve'})),
    path('<int:pr_pk>/reviews/<int:pk>/changes_requested/', ReviewViewSet.as_view({'post': 'changes_requested'})),
    path('<int:pr_pk>/reviews/<int:pk>/comment/', ReviewViewSet.as_view({'post': 'comment'})),
]
