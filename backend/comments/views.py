# comments/views.py

from rest_framework import viewsets, permissions
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.exceptions import PermissionDenied
from django.contrib.contenttypes.models import ContentType

from .models import Comment
from .serializers import CommentSerializer
from .utils import resolve_repository

from config.access.constants import COMMENT
from config.access.services import can_perform_action


class CommentPermission(BasePermission):
    """
    Handles update/delete permissions.
    Create is handled in perform_create().
    """

    def has_permission(self, request, view):
        # Allow listing (filtered in queryset)
        if view.action == "list":
            return True

        # Allow create (checked in perform_create)
        if view.action == "create":
            return request.user.is_authenticated

        return True

    def has_object_permission(self, request, view, obj):
        repo = resolve_repository(obj.content_object)

        # READ
        if request.method in SAFE_METHODS:
            return can_perform_action(request.user, repo, COMMENT)

        # UPDATE (author only)
        if request.method in ["PUT", "PATCH"]:
            return obj.author == request.user

        # DELETE (author OR owner/maintainer)
        if request.method == "DELETE":
            return (
                obj.author == request.user
                or can_perform_action(request.user, repo, COMMENT)
            )

        return False


class CommentViewSet(viewsets.ModelViewSet):
    """
    Universal Comment API

    GET    /api/comments/?model=pullrequest&object_id=5
    POST   /api/comments/
    PATCH  /api/comments/{id}/
    DELETE /api/comments/{id}/
    """

    queryset = Comment.objects.select_related(
        "author",
        "content_type"
    ).all()

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, CommentPermission]
    http_method_names = ["get", "post", "patch", "put", "delete"]

    # ---------------------------------
    # LIST
    # ---------------------------------
    def get_queryset(self):
        qs = Comment.objects.select_related("author", "content_type").all()

        # Detail actions (retrieve, update, delete) need access to all comments
        if self.action != "list":
            return qs

        model = self.request.query_params.get("model")
        object_id = self.request.query_params.get("object_id")

        if not model or not object_id:
            return Comment.objects.none()

        try:
            content_type = ContentType.objects.get(model=model)
        except ContentType.DoesNotExist:
            return Comment.objects.none()

        return qs.filter(
            content_type=content_type,
            object_id=object_id,
            parent=None
        ).prefetch_related("replies")

    # ---------------------------------
    # CREATE
    # ---------------------------------
    def perform_create(self, serializer):
        model = self.request.data.get("model")
        object_id = self.request.data.get("object_id")

        if not model or not object_id:
            raise PermissionDenied("Model and object_id required.")

        try:
            content_type = ContentType.objects.get(model=model)
            target_object = content_type.get_object_for_this_type(id=object_id)
        except Exception:
            raise PermissionDenied("Invalid target object.")

        repo = resolve_repository(target_object)

        if not can_perform_action(self.request.user, repo, COMMENT):
            raise PermissionDenied("You do not have permission to comment here.")

        serializer.save(
            author=self.request.user,
            content_type=content_type,
            object_id=object_id
        )