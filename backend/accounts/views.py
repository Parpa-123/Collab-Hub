from rest_framework.generics import GenericAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import CustomUserSerializer, CustomTokenObtainPairSerializer, AutenticatedUserSerializer
from .models import CustomUser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.authentication import JWTAuthentication
from dj_rest_auth.jwt_auth import JWTCookieAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.mixins import CreateModelMixin, UpdateModelMixin

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