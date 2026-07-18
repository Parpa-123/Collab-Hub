from rest_framework import viewsets, permissions
from .models import Issue, IssueAssignee, Label
from .serializers import IssueSerializer, IssueAssigneeSerializer, LabelSerializer
from repositories.permissions import IsRepositoryMember, IsMaintainer, IsRepositoryAdmin
from repositories.models import Repository
from config.access.services import can_perform_action
from config.access.constants import CREATE_ISSUE, UPDATE_ISSUE, CLOSE_ISSUE
from django_filters.rest_framework import DjangoFilterBackend
from .filters import IssueFilter
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.response import Response
from config.events.dispatcher import dispatch_event
from config.events.event_types import ISSUE_CREATED, ISSUE_ASSIGNED, ISSUE_CLOSED
from rest_framework.filters import OrderingFilter, SearchFilter
from .realtime import broadcast_issue_event

class IssueManagePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        slug = view.kwargs.get('slug')
        try:
            repository = Repository.objects.get(slug=slug)
        except Repository.DoesNotExist:
            return False

        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            from config.access.services import get_repo_membership
            return get_repo_membership(request.user, repository) is not None
        
        if request.method == 'POST':
            return can_perform_action(request.user, repository, CREATE_ISSUE)
        
        if request.method in ['PUT', 'PATCH']:
            return can_perform_action(request.user, repository, UPDATE_ISSUE)
        
        if request.method == 'DELETE':
            return can_perform_action(request.user, repository, CLOSE_ISSUE)

    def get_object_permissions(self, request, view, obj):
        if self.action in ["list", "retrieve"]:
            return [IsRepositoryMember(), permissions.IsAuthenticated()]
        if self.action in ["update", "partial_update"]:
            return [IsMaintainer(), permissions.IsAuthenticated()]
        if self.action == "destroy":
            return [IsRepositoryAdmin(), permissions.IsAuthenticated()]
        return super().get_object_permissions(request, view, obj)

class LabelManagePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        slug = view.kwargs.get('slug')
        try:
            repository = Repository.objects.get(slug=slug)
        except Repository.DoesNotExist:
            return False

        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            from config.access.services import get_repo_membership
            return get_repo_membership(request.user, repository) is not None
        
        if request.method == 'POST':
            return can_perform_action(request.user, repository, CREATE_ISSUE)
        
        if request.method in ['PUT', 'PATCH']:
            return can_perform_action(request.user, repository, UPDATE_ISSUE)
        
        if request.method == 'DELETE':
            return can_perform_action(request.user, repository, CLOSE_ISSUE)

    def get_object_permissions(self, request, view, obj):
        if self.action in ["list", "retrieve"]:
            return [IsRepositoryMember(), permissions.IsAuthenticated()]
        if self.action in ["update", "partial_update"]:
            return [IsMaintainer(), permissions.IsAuthenticated()]
        if self.action == "destroy":
            return [IsRepositoryAdmin(), permissions.IsAuthenticated()]
        return super().get_object_permissions(request, view, obj)

class IssueViewSet(viewsets.ModelViewSet, IssueManagePermission):
    
    serializer_class = IssueSerializer
    permission_classes = [IssueManagePermission, permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = IssueFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "updated_at", "id", "status"]
    ordering = ["-updated_at"]


    def get_queryset(self):
        return Issue.objects.filter(
            repo__slug=self.kwargs.get('slug')
        ).select_related('creator', 'repo').prefetch_related('labels', 'issue_assignees').distinct()

    def get_object(self):
        return Issue.objects.get(repo__slug=self.kwargs.get('slug'), pk=self.kwargs.get('pk'))
    
    def perform_create(self, serializer):
        repo = get_object_or_404(Repository, slug=self.kwargs.get('slug'))
        serializer.save(creator=self.request.user, repo=repo)
        broadcast_issue_event(
            event_type="issue_created",
            issue=serializer.instance,
            actor_id=self.request.user.id,
        )
        
        dispatch_event(
            ISSUE_CREATED,
            {
                "actor": self.request.user,
                "issue": serializer.instance
            }
        )

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        serializer.save()

        event_type = "issue_moved" if old_status != serializer.instance.status else "issue_updated"
        extra_meta = {}
        if event_type == "issue_moved":
            extra_meta = {
                "from_status": old_status,
                "to_status": serializer.instance.status,
            }
            if serializer.instance.status == "CLOSED":
                dispatch_event(
                    ISSUE_CLOSED,
                    {
                        "actor": self.request.user,
                        "issue": serializer.instance,
                    }
                )

        broadcast_issue_event(
            event_type=event_type,
            issue=serializer.instance,
            actor_id=self.request.user.id,
            extra_meta=extra_meta,
        )

    def perform_destroy(self, instance):
        broadcast_issue_event(
            event_type="issue_deleted",
            issue=instance,
            actor_id=self.request.user.id,
        )
        super().perform_destroy(instance)
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None, slug=None):
        issue = self.get_object()
        assignee_id = request.data.get('assignee_id')
        if not assignee_id:
            return Response({"error": "assignee_id is required"}, status=400)
            
        from django.contrib.auth import get_user_model
        user = get_object_or_404(get_user_model(), id=assignee_id)
        
        if IssueAssignee.objects.filter(issue=issue, assignee=user).exists():
            return Response({"error": "User is already assigned to this issue"}, status=400)
            
        issue_assignee = IssueAssignee.objects.create(issue=issue, assignee=user)
        broadcast_issue_event(
            event_type="issue_updated",
            issue=issue,
            actor_id=request.user.id,
            extra_meta={"assignee_id": user.id},
        )
        
        dispatch_event(
            ISSUE_ASSIGNED,
            {
                "actor": request.user,
                "issue": issue,
                "assignee": user,
                "issue_assignee_id": issue_assignee.id,
            }
        )
        return Response({"status": "assigned"}, status=200)
    
    

class LabelViewSet(viewsets.ModelViewSet, LabelManagePermission):
    serializer_class = LabelSerializer
    permission_classes = [LabelManagePermission, permissions.IsAuthenticated]

    def get_queryset(self):
        return Label.objects.filter(repo__slug=self.kwargs.get("slug"))

    def get_object(self):
        return get_object_or_404(
            Label,
            repo__slug=self.kwargs.get("slug"),
            pk=self.kwargs.get("pk"),
        )

    def perform_create(self, serializer):
        repo = get_object_or_404(Repository, slug=self.kwargs.get("slug"))
        serializer.save(repo=repo)
