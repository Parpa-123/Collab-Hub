from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from .models import Repository, RepositoryMember
from .serializers import RepositoryCreateSerializer
from .permissions import IsRepositoryOwner
# Create your views here.

class RepositoryViewSet(ModelViewSet):
    queryset = Repository.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = RepositoryCreateSerializer
    
    def get_permissions(self):
        if self.action == "create":
            return [IsRepositoryOwner()]
        return super().get_permissions()

        
