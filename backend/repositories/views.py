from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import filters
from rest_framework import status
from .models import Repository, RepositoryMember
from .serializers import RepositoryCreateSerializer, ViewRepositorySerializer, RepositoryListSerializer, AddMemberSerializer, UserSearchSerializer, UpdateMemberRoleSerializer, RepositoryMemberSerializer, FileUploadSerializer
from .permissions import IsRepositoryAdmin, IsRepositoryMember, IsMaintainer
from django.db import transaction
from branches.models import Branches, Commit
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.db.models import Q
from config.access.edge_cases import check_last_owner
from config.access.constants import LEAVE_REPO, REPO_ADMIN, REPO_MAINTAINER, REPO_VIEWER, REMOVE_USER, UPDATE_ROLE
from django.shortcuts import get_object_or_404
from config.access.services import get_repo_membership
from storage.services.blob_service import get_or_create_blob
from branches.models import Commit
from storage.models import TreeNode
from storage.services.diff_services import generate_diff
from storage.services.tree_services import build_tree_from_snapshots


class RepositoryViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RepositoryCreateSerializer
    
    def get_permissions(self):
        if self.action in ["create", "list"]:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        return Repository.objects.filter(
            Q(owner=user) |
            Q(repositoryMembers__developer=user) |
            Q(visibility=Repository.Visibility.PUBLIC)
        ).distinct()

    
    @action(detail=True, methods=['get'], url_path="members")
    def get_members(self, request, slug=None):
        repository = self.get_object()
        members = repository.repositoryMembers.all()
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
    
    permission_classes = [IsAuthenticated]
    serializer_class = ViewRepositorySerializer
    lookup_field = 'slug'
    

    def get_queryset(self):
        user = self.request.user
        return Repository.objects.filter(
            Q(owner=user) |
            Q(repositoryMembers__developer=user) |
            Q(visibility=Repository.Visibility.PUBLIC)
        ).distinct()

    @action(detail=True, methods=['get'], url_path="members")
    def list_members(self, request, slug=None):
        repository = self.get_object()
        members = RepositoryMember.objects.filter(repository=repository)
        serializer = RepositoryMemberSerializer(members, many=True)
        return Response(serializer.data)

    @action(
        detail=True, 
        methods=['get'], 
        url_path="search-users",
        filter_backends=[filters.SearchFilter],
        search_fields=['^email', '^first_name', '^last_name']
    )
    def search_users(self, request, slug=None):
        repository = self.get_object()
        
        if not IsMaintainer().has_object_permission(request, self, repository):
            return Response({"message": "You are not authorized to perform this action"}, status=status.HTTP_403_FORBIDDEN)
        
        search_query = request.query_params.get("search", "")
        
        if not search_query:
            return Response({"message": "Search query is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        existing_members = repository.repositoryMembers.values_list("developer", flat=True)
        
        queryset = get_user_model().objects.exclude(id__in=existing_members)
        users = self.filter_queryset(queryset)
        
        serializer = UserSearchSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path="add-member")
    def add_member(self, request, slug=None):
        repository = self.get_object()
        
        if not IsMaintainer().has_object_permission(request, self, repository):
            return Response({"message": "You are not authorized to perform this action"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = AddMemberSerializer(data=request.data, context={"repository": repository})
        serializer.is_valid(raise_exception=True)
        member = repository.repositoryMembers.create(
            developer=serializer.validated_data["developer"],
            role=serializer.validated_data["role"],
        )
        return Response({"message": "Member added successfully", "role": member.role}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def readme(self,request,slug=None):
        repo = self.get_object()
        branch = repo.default_branch
        latest_commit = Branches.objects.filter(repository=repo, name=branch).first()

        if not latest_commit or latest_commit.snapshot is None:
            return Response({"message": "No readme found"}, status=status.HTTP_404_NOT_FOUND)

        readme_content = latest_commit.snapshot.get("README.md", None)
        
        if not readme_content:
            return Response({"message": "No readme found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({"readme": readme_content}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def code_review(self, request, slug=None):
        repo = self.get_object()
        file_path = request.query_params.get("path", None)
        branch = repo.default_branch
        latest_commit = Branches.objects.filter(repository=repo, name=branch).first()

        if not latest_commit or latest_commit.snapshot is None:
            return Response({"message": "No code review found"}, status=status.HTTP_404_NOT_FOUND)

        code_review = latest_commit.snapshot.get(file_path, None)
        
        if not code_review:
            return Response({"message": "No code review found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({"code_review": code_review}, status=status.HTTP_200_OK)


    

    @action(detail=True, methods=['post'], url_path="file-upload")
    def file_upload(self, request, slug=None):
        repository = self.get_object()
        
        if not IsRepositoryMember().has_object_permission(request, self, repository):
            return Response({"message": "You are not authorized to perform this action"}, status=status.HTTP_403_FORBIDDEN)
            
        branch_name = request.data.get("branch", repository.default_branch)
        message = request.data.get("message", "Uploaded files")
        files = request.FILES.getlist("files")
        
        if not files:
            return Response({"error": "No files provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        branch = Branches.objects.filter(repository=repository, name=branch_name).first()
        if not branch:
            return Response({"error": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)
            
        parent_commit = branch.head_commit
        snapshot = parent_commit.snapshot.copy() if parent_commit and parent_commit.snapshot else {}
        
        for file in files:
            path = file.name
            try:
                content = file.read().decode('utf-8')
            except UnicodeDecodeError:
                return Response({"error": f"File {path} is not valid UTF-8 text. Only text files are supported."}, status=status.HTTP_400_BAD_REQUEST)
            
            snapshot[path] = content
            
        with transaction.atomic():
            new_commit = Commit.objects.create(
                repository=repository,
                branch=branch,
                parent=parent_commit,
                message=message,
                author=request.user,
                snapshot=snapshot
            )
            
            build_tree_from_snapshots(new_commit, snapshot)
            
            branch.head_commit = new_commit
            branch.save()
            
        return Response({"message": "Files uploaded and committed successfully."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path="remove-member")
    def remove_member(self, request, slug=None):
        repository = self.get_object()

        if not IsMaintainer().has_object_permission(request, self, repository):
            return Response({"message": "You are not authorized to perform this action"}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"message": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        member = RepositoryMember.objects.filter(repository=repository, developer_id=user_id).first()
        if not member:
            return Response({"message": "Member not found"}, status=status.HTTP_404_NOT_FOUND)

        # If the target member is the requester themselves (leaving), apply LEAVE_REPO check
        if member.developer == request.user:
            if member.role == REPO_ADMIN:
                is_valid, message = check_last_owner(repository, request.user, LEAVE_REPO)
                if not is_valid:
                    return Response({"message": message}, status=status.HTTP_403_FORBIDDEN)
        else:
            # Removing someone else — guard against removing the last admin
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


class RepositoryTree(APIView):
    # Allow public repository access; require repo membership for private repos

    def get(self, request, slug):
        path = request.query_params.get("path","")
        repository = Repository.objects.filter(slug=slug).first()
        if not repository:
            return Response({"files": []}, status=status.HTTP_404_NOT_FOUND)

        # If repository is private, ensure the requester is a member
        if repository.visibility != Repository.Visibility.PUBLIC:
            if not IsRepositoryMember().has_object_permission(request, self, repository):
                return Response({"message": "You are not authorized to view this repository"}, status=status.HTTP_403_FORBIDDEN)
        branch_name = request.query_params.get("branch")

        if branch_name:
            branch = Branches.objects.filter(repository__slug=slug, name=branch_name).first()
            if not branch or not branch.head_commit:
                return Response({"files": []}, status=status.HTTP_404_NOT_FOUND)
            commit = branch.head_commit
        else:
            commit = Commit.objects.filter(repository__slug=slug).order_by("-created_at").first()

        if not commit or not hasattr(commit, 'tree'):
            return Response({"files": []}, status=status.HTTP_404_NOT_FOUND)
        
        tree = commit.tree

        if path == "":
            nodes = TreeNode.objects.filter(tree=tree, parent=None)
        else:
            parent_node = TreeNode.objects.filter(tree=tree, path=path).first()
            if not parent_node:
                return Response({"files": []}, status=status.HTTP_404_NOT_FOUND)
            nodes = parent_node.treenode_set.all()
        
        data = [
            {
                "name": node.name,
                "path": node.path,
                "type": node.type
            }
            for node in nodes
        ]
        
        return Response({
            "branch": branch_name or "main",
            "commit_id": str(commit.id),
            "files": data
        }, status=status.HTTP_200_OK)


class FileContent(APIView):
    # Allow public repository access; require repo membership for private repos

    def get(self, request, slug):
        path = request.query_params.get("path")
        branch_name = request.query_params.get("branch")
        repository = Repository.objects.filter(slug=slug).first()
        if not repository:
            return Response({'error' : 'Repository not found'}, status = status.HTTP_404_NOT_FOUND)

        # Allow access to public repos; otherwise enforce membership
        if repository.visibility != Repository.Visibility.PUBLIC:
            if not IsRepositoryMember().has_object_permission(request, self, repository):
                return Response({"message": "You are not authorized to view this file"}, status=status.HTTP_403_FORBIDDEN)

        if not path:
            return Response({'error' : 'Path is required'},status = status.HTTP_400_BAD_REQUEST)
        
        if branch_name:
            branch = Branches.objects.filter(repository__slug=slug, name=branch_name).first()
            if not branch or not branch.head_commit:
                return Response({'error' : 'Branch or commit not found'}, status=status.HTTP_404_NOT_FOUND)
            commit = branch.head_commit
        else:
            commit = Commit.objects.filter(repository__slug=slug).order_by('-created_at').first()

        if not commit or not hasattr(commit, 'tree'):
            return Response({'error' : 'No commit found'},status = status.HTTP_404_NOT_FOUND)
        
        tree = commit.tree
        node = TreeNode.objects.filter(tree=tree, path=path).first()
        if not node:
            return Response({'error' : 'No node found'},status = status.HTTP_404_NOT_FOUND)
        
        content = node.blob.content if node.blob else ""
        return Response({'content' : content},status = status.HTTP_200_OK)

class CommitDiffView(APIView):
    # Allow public repository access; require repo membership for private repos

    def get(self, request, slug):
        base_id = request.query_params.get("base_id")
        head_id = request.query_params.get("head_id")
        repository = Repository.objects.filter(slug=slug).first()
        if not repository:
            return Response({'error': 'Repository not found'}, status=status.HTTP_404_NOT_FOUND)

        # Enforce membership for private repositories
        if repository.visibility != Repository.Visibility.PUBLIC:
            if not IsRepositoryMember().has_object_permission(request, self, repository):
                return Response({"message": "You are not authorized to view diffs for this repository"}, status=status.HTTP_403_FORBIDDEN)
        if not base_id or not head_id:
            return Response({'error': 'Base and head IDs are required'}, status=status.HTTP_400_BAD_REQUEST)

        base_commit = Commit.objects.filter(repository__slug=slug, id=base_id).first()
        head_commit = Commit.objects.filter(repository__slug=slug, id=head_id).first()
        if not base_commit or not head_commit:
            return Response({'error': 'No commit found'}, status=status.HTTP_404_NOT_FOUND)

        # generate_diff handles the full diff across both commit snapshots
        result = generate_diff(base_commit, head_commit)
        return Response(result, status=status.HTTP_200_OK)