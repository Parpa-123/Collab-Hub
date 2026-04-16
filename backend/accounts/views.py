from django.db.models import Q
from rest_framework.generics import GenericAPIView, RetrieveAPIView
from rest_framework.response import Response
from .serializers import CustomUserSerializer, CustomTokenObtainPairSerializer, AutenticatedUserSerializer
from .models import CustomUser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.authentication import JWTAuthentication
from dj_rest_auth.jwt_auth import JWTCookieAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.mixins import CreateModelMixin, UpdateModelMixin
from rest_framework.views import APIView
from repositories.models import Repository
from PullRequest.models import PullRequest
from issues.models import Issue, IssueChoices
from notifications.models import Notification

# Create your views here.
class CustomUserCreate(GenericAPIView, CreateModelMixin, UpdateModelMixin):
    
    serializer_class = CustomUserSerializer
    queryset = CustomUser.objects.all()

    def get_object(self):
        return self.request.user

    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsAuthenticated()]

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)
    
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

class AuthenticationView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class AuthenticatedUserView(RetrieveAPIView):
    # Support both cookie-based (OAuth) and header-based (manual login) JWT
    authentication_classes = [JWTCookieAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AutenticatedUserSerializer

    def get_object(self):
        return self.request.user


class ProfileSummaryView(APIView):
    authentication_classes = [JWTCookieAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        member_repo_queryset = Repository.objects.filter(
            Q(owner=user) | Q(repositoryMembers__developer=user)
        ).distinct()

        repository_count = member_repo_queryset.count()
        public_repository_count = member_repo_queryset.filter(
            visibility=Repository.Visibility.PUBLIC
        ).count()
        private_repository_count = member_repo_queryset.filter(
            visibility=Repository.Visibility.PRIVATE
        ).count()

        active_issue_count = Issue.objects.filter(
            repo__in=member_repo_queryset,
            status__in=[IssueChoices.OPEN, IssueChoices.IN_PROGRESS],
        ).count()
        open_pull_request_count = PullRequest.objects.filter(
            repo__in=member_repo_queryset,
            status="OPEN",
        ).count()
        unread_notification_count = Notification.objects.filter(
            recipient=user, is_read=False
        ).count()

        return Response(
            {
                "user": {
                    "pk": user.pk,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "bio": user.bio,
                    "created_at": user.created_at,
                },
                "stats": {
                    "repositories": repository_count,
                    "public_repositories": public_repository_count,
                    "private_repositories": private_repository_count,
                    "open_pull_requests": open_pull_request_count,
                    "active_issues": active_issue_count,
                    "unread_notifications": unread_notification_count,
                },
            }
        )
