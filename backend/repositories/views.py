from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Repository, RepositoryMember
from .serializers import RepositoryCreateSerializer, ViewRepositorySerializer, RepositoryListSerializer, AddMemberSerializer, UserSearchSerializer, UpdateMemberRoleSerializer, RepositoryMemberSerializer, FileUploadSerializer
from .permissions import IsRepositoryAdmin, IsRepositoryMember, IsMaintainer, IsPublicOrRepositoryMember
from django.db import transaction
from branches.models import Branches, Commit
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.db.models import Q, Subquery, OuterRef
from config.access.edge_cases import check_last_owner
from config.access.constants import LEAVE_REPO, REPO_ADMIN, REPO_MAINTAINER, REPO_VIEWER, REMOVE_USER, UPDATE_ROLE
from django.shortcuts import get_object_or_404
from config.access.services import get_repo_membership
from storage.services.blob_service import get_or_create_blob
from branches.models import Commit
from storage.models import TreeNode
from storage.services.diff_services import generate_diff
from storage.services.tree_services import build_tree_from_snapshots
from config.events.dispatcher import dispatch_event
from config.events.event_types import REPO_MEMBER_ADDED


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
            Q(repositoryMembers__developer=user)
        ).distinct().annotate(
            my_role=Subquery(
                RepositoryMember.objects.filter(
                    repository=OuterRef('pk'), developer=user
                ).values('role')[:1]
            )
        )

    @action(detail=True, methods=['get'], url_path="members")
    def get_members(self, request, slug=None):
        repository = self.get_object()
        members = repository.repositoryMembers.select_related('developer').all()
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

class PublicRepositoryViewSet(ModelViewSet):
    permission_classes = []
    serializer_class = RepositoryListSerializer
    
    def get_queryset(self):
        return Repository.objects.filter(visibility=Repository.Visibility.PUBLIC).distinct()

class RepositoryDetailView(ModelViewSet):
    
    permission_classes = [IsPublicOrRepositoryMember]
    serializer_class = ViewRepositorySerializer
    lookup_field = 'slug'
    

    def get_queryset(self):
        user = self.request.user
        queryset = Repository.objects.all()
        if user.is_authenticated:
            return queryset.filter(
                Q(owner=user) |
                Q(repositoryMembers__developer=user) |
                Q(visibility=Repository.Visibility.PUBLIC)
            ).distinct().annotate(
                my_role=Subquery(
                    RepositoryMember.objects.filter(
                        repository=OuterRef('pk'), developer=user
                    ).values('role')[:1]
                )
            ).prefetch_related('branches')
        else:
            return queryset.filter(visibility=Repository.Visibility.PUBLIC).distinct().prefetch_related('branches')

    @action(detail=True, methods=['get'], url_path="members")
    def list_members(self, request, slug=None):
        repository = self.get_object()
        members = RepositoryMember.objects.filter(repository=repository).select_related('developer')
        serializer = RepositoryMemberSerializer(members, many=True)
        return Response(serializer.data)

    @action(
        detail=True, 
        methods=['get'], 
        url_path="search-users",
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
        for term in search_query.split():
            queryset = queryset.filter(
                Q(email__icontains=term)
                | Q(first_name__icontains=term)
                | Q(last_name__icontains=term)
            )

        users = queryset.order_by("first_name", "last_name", "email")[:20]
        
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
        dispatch_event(
            REPO_MEMBER_ADDED,
            {
                "actor": request.user,
                "repo": repository,
                "member": serializer.validated_data["developer"],
            }
        )
        return Response({"message": "Member added successfully", "role": member.role}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def readme(self,request,slug=None):
        repo = self.get_object()
        branch = repo.default_branch
        latest_commit = Branches.objects.filter(repository=repo, name=branch).first()

        if not latest_commit or latest_commit.snapshot is None:
            return Response({"message": "No readme found"}, status=status.HTTP_404_NOT_FOUND)

        readme_blob_id = latest_commit.snapshot.get("README.md", None)
        
        if not readme_blob_id:
            return Response({"message": "No readme found"}, status=status.HTTP_404_NOT_FOUND)
            
        from storage.models import Blob
        readme_blob = Blob.objects.filter(id=readme_blob_id).first()
        
        if not readme_blob:
            return Response({"message": "No readme found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({"readme": readme_blob.content}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def code_review(self, request, slug=None):
        repo = self.get_object()
        file_path = request.query_params.get("path", None)
        branch = repo.default_branch
        latest_commit = Branches.objects.filter(repository=repo, name=branch).first()

        if not latest_commit or latest_commit.snapshot is None:
            return Response({"message": "No code review found"}, status=status.HTTP_404_NOT_FOUND)

        blob_id = latest_commit.snapshot.get(file_path, None)
        
        if not blob_id:
            return Response({"message": "No code review found"}, status=status.HTTP_404_NOT_FOUND)
            
        from storage.models import Blob
        blob = Blob.objects.filter(id=blob_id).first()
        
        if not blob:
            return Response({"message": "No code review found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({"code_review": blob.content}, status=status.HTTP_200_OK)


    

    @action(detail=True, methods=['post'], url_path="file-upload")
    def file_upload(self, request, slug=None):
        repository = self.get_object()
        
        if not IsRepositoryMember().has_object_permission(request, self, repository):
            return Response({"message": "You are not authorized to perform this action"}, status=status.HTTP_403_FORBIDDEN)
            
        branch_name = request.data.get("branch", repository.default_branch)
        message = request.data.get("message", "Uploaded files")
        files = request.FILES.getlist("files")
        file_paths = request.data.getlist("file_paths")
        
        if not files:
            return Response({"error": "No files provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        branch = Branches.objects.filter(repository=repository, name=branch_name).first()
        if not branch:
            return Response({"error": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)
            
        parent_commit = branch.head_commit
        snapshot = parent_commit.snapshot.copy() if parent_commit and parent_commit.snapshot else {}
        
        if len(file_paths) != len(files):
            file_paths = [file.name for file in files]
            
        import base64
        import mimetypes
        from storage.services.blob_service import bulk_get_or_create_blobs
        
        file_data_list = []
        
        for file, path in zip(files, file_paths):
            raw_content = file.read()
            is_binary = False
            try:
                content = raw_content.decode('utf-8')
            except UnicodeDecodeError:
                is_binary = True
                mime_type, _ = mimetypes.guess_type(path)
                mime_type = mime_type or 'application/octet-stream'
                encoded = base64.b64encode(raw_content).decode('ascii')
                content = f"data:{mime_type};base64,{encoded}"
            
            file_data_list.append({
                'path': path,
                'content': content,
                'is_binary': is_binary
            })
            
        path_to_blob_id = bulk_get_or_create_blobs(file_data_list)
        for path, blob_id in path_to_blob_id.items():
            snapshot[path] = blob_id
            
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

    @action(detail=True, methods=['post'], url_path="async-file-upload")
    def async_file_upload(self, request, slug=None):
        repository = self.get_object()
        
        if not IsRepositoryMember().has_object_permission(request, self, repository):
            return Response({"message": "You are not authorized to perform this action"}, status=status.HTTP_403_FORBIDDEN)
            
        branch_name = request.data.get("branch", repository.default_branch)
        message = request.data.get("message", "Uploaded files")
        files = request.FILES.getlist("files")
        file_paths = request.data.getlist("file_paths")
        
        if not files:
            return Response({"error": "No files provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        branch = Branches.objects.filter(repository=repository, name=branch_name).first()
        if not branch:
            return Response({"error": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if len(file_paths) != len(files):
            file_paths = [file.name for file in files]
            
        import base64
        import mimetypes
        file_data_list = []
        
        for file, path in zip(files, file_paths):
            raw_content = file.read()
            is_binary = False
            try:
                content = raw_content.decode('utf-8')
            except UnicodeDecodeError:
                is_binary = True
                mime_type, _ = mimetypes.guess_type(path)
                mime_type = mime_type or 'application/octet-stream'
                encoded = base64.b64encode(raw_content).decode('ascii')
                content = f"data:{mime_type};base64,{encoded}"
            
            file_data_list.append({
                'path': path,
                'content': content,
                'is_binary': is_binary
            })
            
        from .tasks import process_async_upload
        task = process_async_upload.delay(repository.id, branch.name, message, request.user.id, file_data_list)
        
        return Response({"message": "Upload processing started", "task_id": task.id}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['get'], url_path="upload-status/(?P<task_id>[^/.]+)")
    def upload_status(self, request, slug=None, task_id=None):
        from celery.result import AsyncResult
        task_result = AsyncResult(task_id)
        
        if task_result.state == 'PENDING':
            return Response({"status": "PENDING", "message": "Upload is waiting to be processed"}, status=status.HTTP_200_OK)
        elif task_result.state == 'SUCCESS':
            return Response(task_result.result, status=status.HTTP_200_OK)
        elif task_result.state == 'FAILURE':
            return Response({"status": "FAILURE", "message": str(task_result.info)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({"status": task_result.state, "message": "Task is processing"}, status=status.HTTP_200_OK)


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

    @action(detail=True, methods=['post'], url_path="missing-objects")
    def missing_objects(self, request, slug=None):
        repository = self.get_object()
        if not IsRepositoryMember().has_object_permission(request, self, repository):
            return Response({"message": "You are not authorized"}, status=status.HTTP_403_FORBIDDEN)
            
        object_hashes = request.data.get("objects", [])
        if not object_hashes:
            return Response({"missing": []}, status=status.HTTP_200_OK)
            
        from storage.services.blob_service import get_missing_blob_hashes
        missing = get_missing_blob_hashes(object_hashes)
        return Response({"missing": missing}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path="push")
    def push(self, request, slug=None):
        repository = self.get_object()
        if not IsRepositoryMember().has_object_permission(request, self, repository):
            return Response({"message": "You are not authorized"}, status=status.HTTP_403_FORBIDDEN)
            
        payload = request.data
        commit_data = payload.get("commit", {})
        tree_data = payload.get("tree", {})
        blobs_data = payload.get("blobs", {})
        branch_name = payload.get("branch", repository.default_branch)
        
        branch = Branches.objects.filter(repository=repository, name=branch_name).first()
        if not branch:
            branch = Branches.objects.create(repository=repository, name=branch_name, created_by=request.user)
            
        # Verify parent
        parent_hash = commit_data.get("parent")
        parent_commit = Commit.objects.filter(id=parent_hash).first() if parent_hash else branch.head_commit
        
        import base64
        import mimetypes
        from storage.services.blob_service import bulk_get_or_create_blobs
        from storage.models import Blob
        
        file_data_list = []
        for file_path, content_hash in tree_data.items():
            base64_blob = blobs_data.get(content_hash)
            if base64_blob:
                raw_content = base64.b64decode(base64_blob)
                is_binary = False
                try:
                    content = raw_content.decode('utf-8')
                except UnicodeDecodeError:
                    is_binary = True
                    mime_type, _ = mimetypes.guess_type(file_path)
                    mime_type = mime_type or 'application/octet-stream'
                    encoded = base64.b64encode(raw_content).decode('ascii')
                    content = f"data:{mime_type};base64,{encoded}"
                
                file_data_list.append({
                    'path': file_path,
                    'content': content,
                    'is_binary': is_binary
                })
        
        path_to_blob_id = bulk_get_or_create_blobs(file_data_list)
        
        snapshot = {}
        for file_path, content_hash in tree_data.items():
            if file_path in path_to_blob_id:
                snapshot[file_path] = path_to_blob_id[file_path]
            else:
                blob = Blob.objects.filter(content_hash=content_hash).first()
                if blob:
                    snapshot[file_path] = str(blob.id)
                    
        with transaction.atomic():
            new_commit = Commit.objects.create(
                repository=repository,
                branch=branch,
                parent=parent_commit,
                message=commit_data.get("message", "Pushed via Web"),
                author=request.user,
                snapshot=snapshot
            )
            
            build_tree_from_snapshots(new_commit, snapshot)
            branch.head_commit = new_commit
            branch.save()
            
        return Response({"message": "Successfully pushed", "commit": str(new_commit.id)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path="commits")
    def commits(self, request, slug=None):
        repository = self.get_object()
        if not IsRepositoryMember().has_object_permission(request, self, repository) and repository.visibility != Repository.Visibility.PUBLIC:
             return Response({"message": "You are not authorized"}, status=status.HTTP_403_FORBIDDEN)
             
        branch_name = request.query_params.get("branch", repository.default_branch)
        branch = Branches.objects.filter(repository=repository, name=branch_name).first()
        if not branch or not branch.head_commit:
            return Response([], status=status.HTTP_200_OK)
            
        commit = branch.head_commit
        
        tree_mapping = {}
        blobs_data = {}
        import base64
        import re
        from storage.models import Blob
        
        import uuid
        import re
        from storage.models import Blob
        import base64

        all_blob_ids = set()
        for b_id in commit.snapshot.values():
            if b_id:
                try:
                    all_blob_ids.add(uuid.UUID(str(b_id)))
                except ValueError:
                    pass
        
        blobs_dict = Blob.objects.in_bulk(list(all_blob_ids))

        for path, blob_id in commit.snapshot.items():
            blob = None
            if blob_id:
                try:
                    blob = blobs_dict.get(uuid.UUID(str(blob_id)))
                except ValueError:
                    pass

            if blob:
                content_hash = blob.content_hash
                tree_mapping[path] = content_hash
                
                if blob.is_binary:
                    match = re.match(r"data:.*?;base64,(.*)", blob.content)
                    b64 = match.group(1) if match else blob.content
                    blobs_data[content_hash] = b64
                else:
                    blobs_data[content_hash] = base64.b64encode(blob.content.encode('utf-8')).decode('ascii')
        
        payload = [{
            "commit": {
                "message": commit.message,
                "timestamp": commit.created_at.timestamp(),
                "parent": str(commit.parent.id) if commit.parent else None
            },
            "commit_hash": str(commit.id),
            "tree": tree_mapping,
            "tree_hash": str(commit.id),
            "blobs": blobs_data
        }]
        
        return Response(payload, status=status.HTTP_200_OK)
    def get_permissions(self):
        if self.action == "retrieve":
            return [IsPublicOrRepositoryMember()]
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


from django.http import StreamingHttpResponse, HttpResponse
import datetime
import stat

class DownloadRepositoryZipView(APIView):
    def get(self, request, slug):
        branch_name = request.query_params.get("branch")
        repository = Repository.objects.filter(slug=slug).first()
        if not repository:
            return Response({'error' : 'Repository not found'}, status = status.HTTP_404_NOT_FOUND)

        if repository.visibility != Repository.Visibility.PUBLIC:
            if not IsRepositoryMember().has_object_permission(request, self, repository):
                return Response({"message": "You are not authorized to download this repository"}, status=status.HTTP_403_FORBIDDEN)

        if branch_name:
            branch = Branches.objects.filter(repository__slug=slug, name=branch_name).first()
            if not branch or not branch.head_commit:
                return Response({'error' : 'Branch or commit not found'}, status=status.HTTP_404_NOT_FOUND)
            commit = branch.head_commit
        else:
            commit = Commit.objects.filter(repository__slug=slug).order_by('-created_at').first()

        if not commit or not hasattr(commit, 'tree'):
            return Response({'error' : 'No commit found'},status = status.HTTP_404_NOT_FOUND)
        
        nodes = TreeNode.objects.filter(tree=commit.tree, type='file').select_related('blob')

        try:
            from stream_zip import stream_zip, ZIP_32
            
            def generate_zip_chunks():
                now = datetime.datetime.now()
                for node in nodes:
                    if node.blob:
                        # stream_zip expects an iterable of chunks for the file content
                        yield (
                            node.path, 
                            now, 
                            stat.S_IFREG | 0o644, 
                            ZIP_32,
                            (node.blob.content.encode('utf-8'),)
                        )
                        
            response = StreamingHttpResponse(stream_zip(generate_zip_chunks()), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{repository.name}-{branch.name if branch_name else "main"}.zip"'
            return response
            
        except ImportError:
            # Fallback if stream-zip is not installed
            import zipfile
            import io
            buffer = io.BytesIO()
            with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for node in nodes:
                    if node.blob:
                        zip_file.writestr(node.path, node.blob.content)
            
            response = HttpResponse(buffer.getvalue(), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{repository.name}-{branch.name if branch_name else "main"}.zip"'
            return response


class DownloadFileView(APIView):
    def get(self, request, slug):
        path = request.query_params.get("path")
        branch_name = request.query_params.get("branch")
        repository = Repository.objects.filter(slug=slug).first()
        if not repository:
            return Response({'error' : 'Repository not found'}, status = status.HTTP_404_NOT_FOUND)

        if repository.visibility != Repository.Visibility.PUBLIC:
            if not IsRepositoryMember().has_object_permission(request, self, repository):
                return Response({"message": "You are not authorized to download this file"}, status=status.HTTP_403_FORBIDDEN)

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
        
        node = TreeNode.objects.filter(tree=commit.tree, path=path).first()
        if not node or not node.blob:
            return Response({'error' : 'File not found'},status = status.HTTP_404_NOT_FOUND)
        
        response = HttpResponse(node.blob.content.encode('utf-8'), content_type='application/octet-stream')
        # Extract filename from path (e.g. src/App.tsx -> App.tsx)
        filename = path.split('/')[-1] if '/' in path else path
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

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
