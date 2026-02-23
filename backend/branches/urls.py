from django.urls import path
from .views import BranchesViewSet, CommitViewSet

urlpatterns = [
    path('', BranchesViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<int:pk>/', BranchesViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),

    # Commit routes (nested under a specific branch)
    path('<int:branch_pk>/commits/', CommitViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<int:branch_pk>/commits/<int:pk>/', CommitViewSet.as_view({'get': 'retrieve'})),
]
