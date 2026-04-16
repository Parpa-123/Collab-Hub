from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.microsoft.views import MicrosoftGraphOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from django.conf import settings


class GoogleLogin(SocialLoginView):
    """
    Google OAuth2 login view that returns JWT tokens.
    Use this endpoint for SPA/API-based OAuth login.
    """
    adapter_class = GoogleOAuth2Adapter
    callback_url = "http://localhost:5173/auth/callback"
    client_class = OAuth2Client


class MicrosoftLogin(SocialLoginView):
    """
    Microsoft OAuth2 login view that returns JWT tokens.
    Use this endpoint for SPA/API-based OAuth login.
    """
    adapter_class = MicrosoftGraphOAuth2Adapter
    callback_url = "http://localhost:5173/auth/callback"
    client_class = OAuth2Client
