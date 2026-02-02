from django.urls import path
from .views import BranchesViewSet

urlpatterns = [
    path('', BranchesViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('<int:pk>/', BranchesViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
]
