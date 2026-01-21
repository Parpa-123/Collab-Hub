from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import CustomUserSerializer, CustomTokenObtainPairSerializer, AutenticatedUserSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.authentication import JWTAuthentication

# Create your views here.
class CustomUserCreate(generics.CreateAPIView):
    
    serializer_class = CustomUserSerializer

class AuthenticationView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class AuthenticatedUserView(generics.RetrieveUpdateAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = AutenticatedUserSerializer