from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Repository, RepositoryMember
from .serializers import RepositoryCreateSerializer, ViewRepositorySerializer, RepositoryListSerializer, AddMemberSerializer, UserSearchSerializer, UpdateMemberRoleSerializer, RepositoryMemberSerializer
from .permissions import IsRepositoryAdmin, IsRepositoryMember, IsMaintainer
from django.db import transaction
from branches.models import Branches
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.db.models import Q
from config.access.edge_cases import check_last_owner
from config.access.constants import LEAVE_REPO, REPO_ADMIN, REPO_MAINTAINER, REPO_VIEWER, REMOVE_USER, UPDATE_ROLE
from django.shortcuts import get_object_or_404


class RepositoryViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RepositoryCreateSerializer
    
    def get_permissions(self):
        if self.action in ["create", "list"]:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        return Repository.objects.filter(
            Q(owner=self.request.user) |
            Q(repositoryMembers__developer=self.request.user)
        ).distinct()

    
    @action(detail=True, methods=['get'], url_path="members")
    def get_members(self, request, slug=None):
        repository = self.get_object()
        members = RepositoryMember.objects.filter(repository=repository)
        serializer = RepositoryMemberSerializer(members, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        with transaction.atomic():
            repository = serializer.save(owner=self.request.user)
            RepositoryMember.objects.create(
                repository=repository,
                developer=self.request.user,
                role=RepositoryMember.Role.REPO_ADMIN
            )
            
            Branches.objects.create(
                name=repository.default_branch,
                repository=repository,
                is_default=True,
                created_by=self.request.user
            )

    def get_serializer_class(self):
        if self.action == "list":
            return RepositoryListSerializer
        return super().get_serializer_class()

class RepositoryDetailView(ModelViewSet):
    queryset = Repository.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = ViewRepositorySerializer
    lookup_field = "slug"

    @action(detail=True, methods=['get'], url_path="members")
    def list_members(self, request, slug=None):
        repository = self.get_object()
        members = RepositoryMember.objects.filter(repository=repository)
        serializer = RepositoryMemberSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path="search-users")
    def search_users(self, request, slug=None):
        repository = self.get_object()
        
        if not IsMaintainer().has_object_permission(request, self, repository):
            return Response({"message": "You are not authorized to perform this action"}, status=status.HTTP_403_FORBIDDEN)
        
        search_query = request.query_params.get("search", "")
        
        if not search_query:
            return Response({"message": "Search query is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        existing_members = repository.repositoryMembers.values_list("developer", flat=True)
        
        users = get_user_model().objects.filter(
            Q(email__icontains=search_query) |
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query),
        ).exclude(id__in=existing_members)
        
        serializer = UserSearchSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path="add-member")
    def add_member(self, request, slug=None):
        repository = self.get_object()
        
        if not IsMaintainer().has_object_permission(request, self, repository):
            return Response({"message": "You are not authorized to perform this action"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = AddMemberSerializer(data=request.data, context={"repository": repository})
        serializer.is_valid(raise_exception=True)
        member = RepositoryMember.objects.create(
            repository=repository,
            developer=serializer.validated_data["developer"],
            role=serializer.validated_data["role"],
            
        )
        return Response({"message": "Member added successfully", "role": member.role}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path="remove-member")
    def remove_member(self, request, slug=None):
        repository = self.get_object()
        
        if not IsMaintainer().has_object_permission(request, self, repository):
            return Response({"message": "You are not authorized to perform this action"}, status=status.HTTP_403_FORBIDDEN)
        
        member = RepositoryMember.objects.filter(repository=repository, developer=request.user).first()

        if member.developer == request.user:
            if member.role == REPO_ADMIN:
                is_valid, message = check_last_owner(repository, request.user, LEAVE_REPO)
                if not is_valid:
                    return Response({"message": message}, status=status.HTTP_403_FORBIDDEN)
        
        if member.role == REPO_ADMIN:
            is_valid, message = check_last_owner(repository, request.user, REMOVE_USER)
            if not is_valid:
                return Response({"message": message}, status=status.HTTP_403_FORBIDDEN)
        member.delete()
        return Response({"message": "Member removed successfully"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path="members/(?P<member_id>[^/.]+)/role")
    def update_role(self, request, slug=None, member_id=None):
        repository = self.get_object()

        member = get_object_or_404(RepositoryMember, repository=repository, id=member_id)

        new_role = request.data.get("role")
        
        if not IsRepositoryAdmin().has_object_permission(request, self, repository):
            return Response({"message": "Only admins can change member roles"}, status=status.HTTP_403_FORBIDDEN)
        
        if member.role == REPO_ADMIN and new_role != REPO_ADMIN:
            is_valid, message = check_last_owner(repository, request.user, UPDATE_ROLE)
            if not is_valid:
                return Response({"message": message}, status=status.HTTP_403_FORBIDDEN)

        member.role = new_role
        member.save()

        serializer = UpdateMemberRoleSerializer(member)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path="my-role")
    def my_role(self, request, slug=None):
        repository = self.get_object()
        member = RepositoryMember.objects.filter(repository=repository, developer=request.user).first()
        if not member:
            return Response({"role": None}, status=status.HTTP_200_OK)
        return Response({"role": member.role}, status=status.HTTP_200_OK)

    
    
    def get_permissions(self):
        if self.action == "retrieve":
            return [IsRepositoryMember(), IsAuthenticated()]
        if self.action in ["update", "partial_update"]:
            return [IsMaintainer(), IsAuthenticated()]
        if self.action == "destroy":
            return [IsRepositoryAdmin(), IsAuthenticated()]
        return super().get_permissions()
    

class OptionAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            "visibility": [
                {"value" : repo[0], "label" : repo[1]} for repo in Repository.Visibility.choices
            ],
            "roles": [
                {"value" : role[0], "label" : role[1]} for role in RepositoryMember.Role.choices
            ]
        })
