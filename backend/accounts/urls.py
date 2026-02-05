from django.urls import path
from .views import CustomUserCreate, AuthenticatedUserView, AuthenticationView
from .social_views import GoogleLogin, MicrosoftLogin
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView

app_name = "accounts"
urlpatterns = [
    path('register/', CustomUserCreate.as_view(), name='register'),
    path('refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('login/', AuthenticationView.as_view(), name='login'),
    path('me/', AuthenticatedUserView.as_view(), name='me'),
    # Social login endpoints that return JWT tokens
    path('google/', GoogleLogin.as_view(), name='google_login'),
    path('microsoft/', MicrosoftLogin.as_view(), name='microsoft_login'),
]
