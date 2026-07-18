from django.urls import path
from .views import IssueViewSet, LabelViewSet

urlpatterns = [
    path('issues/', IssueViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('issues/<int:pk>/', IssueViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})),
    path('issues/<int:pk>/assign/', IssueViewSet.as_view({'post': 'assign'})),
    path('labels/', LabelViewSet.as_view({
        "get": "list",
        "post": "create",
    })),
    path('labels/<int:pk>/', LabelViewSet.as_view({
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    })),
]
