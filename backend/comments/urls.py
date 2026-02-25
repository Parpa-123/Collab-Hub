

from django.urls import path
from .views import CommentViewSet

urlpatterns = [
    path(
        "",
        CommentViewSet.as_view({"get": "list", "post": "create"}),
        name="comment-list",
    ),
    path(
        "<int:pk>/",
        CommentViewSet.as_view({
            "get": "retrieve",
            "patch": "partial_update",
            "put": "update",
            "delete": "destroy",
        }),
        name="comment-detail",
    ),
]
