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
            # If the request contains a target model/object, resolve the repository
            # and check the user's commenting permission there. Fall back to
            # authenticated check if repository can't be resolved.
            model_name = request.data.get('model')
            object_id = request.data.get('object_id')
            if model_name and object_id:
                try:
                    ct = ContentType.objects.get(model=model_name)
                    obj = ct.get_object_for_this_type(pk=object_id)
                    repo = resolve_repository(obj)
                    if repo:
                        return can_perform_action(request.user, repo, COMMENT)
                except Exception:
                    # Fall back to basic auth check on any error resolving
                    pass
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

    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [CommentPermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        entity_type = self.request.query_params.get("model") or self.request.query_params.get("entity_type")
        entity_id = self.request.query_params.get("object_id") or self.request.query_params.get("entity_id")
        path = self.request.query_params.get('path')

        if entity_type and entity_id:
            queryset = queryset.filter(
                content_type=ContentType.objects.get(model=entity_type),
                object_id=entity_id
            )
        
        if path:
            queryset = queryset.filter(path=path)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        model_name = self.request.data.get('model')
        object_id = self.request.data.get('object_id')
        file_path = self.request.data.get('path')
        
        save_kwargs = {'author': self.request.user}
        if file_path:
            save_kwargs['path'] = file_path
            
        if model_name and object_id:
            content_type = ContentType.objects.get(model=model_name)
            save_kwargs['content_type'] = content_type
            save_kwargs['object_id'] = object_id

        instance = serializer.save(**save_kwargs)
        
        from config.events.dispatcher import dispatch_event
        from config.events.event_types import COMMENT_CREATED
        dispatch_event(COMMENT_CREATED, {
            "actor": self.request.user,
            "comment": instance
        })