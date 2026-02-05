from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Repository, RepositoryMember
from .serializers import RepositoryCreateSerializer, ViewRepositorySerializer, RepositoryListSerializer
from .permissions import IsRepositoryAdmin, IsRepositoryMember, IsMaintainer
from django.db import transaction
from branches.models import Branches


class RepositoryViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RepositoryCreateSerializer
    
    def get_permissions(self):
        if self.action in ["create", "list"]:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        return Repository.objects.filter(owner=self.request.user)

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