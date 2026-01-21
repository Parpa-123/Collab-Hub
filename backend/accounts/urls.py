from django.urls import path
from .views import CustomUserCreate, AuthenticatedUserView, AuthenticationView
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView

app_name = "accounts"
urlpatterns = [
    path('register/', CustomUserCreate.as_view(), name='register'),
    path('refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('login/', AuthenticationView.as_view(), name='login'),
    path('me/', AuthenticatedUserView.as_view(), name='me'),
]
