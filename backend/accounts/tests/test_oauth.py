from django.test import TestCase, RequestFactory, override_settings
from django.http import HttpResponse, HttpResponseRedirect
from django.contrib.auth import get_user_model
from django.contrib.sessions.backends.db import SessionStore
from unittest.mock import MagicMock, patch

from rest_framework.test import APIClient, APIRequestFactory
from rest_framework import status

from accounts.adapters import CustomSocialAccountAdapter, set_jwt_cookies
from accounts.middleware import JWTCookieMiddleware
from accounts.social_views import GoogleLogin, MicrosoftLogin
from accounts.serializers import (
    CustomUserSerializer,
    CustomTokenObtainPairSerializer,
    AutenticatedUserSerializer,
)
from accounts.exceptions import custom_exception_handler

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.microsoft.views import MicrosoftGraphOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client

User = get_user_model()


# ═══════════════════════════════════════════════════════════════════════
#  CustomSocialAccountAdapter
# ═══════════════════════════════════════════════════════════════════════

class CustomSocialAccountAdapterTest(TestCase):
    """Tests for the CustomSocialAccountAdapter.save_user() logic."""

    def setUp(self):
        self.adapter = CustomSocialAccountAdapter()
        self.request = RequestFactory().get("/")

    def _make_sociallogin(self, provider, extra_data):
        """Create a mock sociallogin object with the given provider/data."""
        sociallogin = MagicMock()
        sociallogin.account.provider = provider
        sociallogin.account.extra_data = extra_data
        return sociallogin

    @patch.object(CustomSocialAccountAdapter.__bases__[0], "save_user")
    def test_google_provider_sets_first_and_last_name(self, mock_super_save):
        """Google login should populate first_name/last_name from extra_data."""
        user = User(email="google@example.com")
        mock_super_save.return_value = user

        sociallogin = self._make_sociallogin("google", {
            "given_name": "Jane",
            "family_name": "Doe",
        })

        result = self.adapter.save_user(self.request, sociallogin)
        self.assertEqual(result.first_name, "Jane")
        self.assertEqual(result.last_name, "Doe")

    @patch.object(CustomSocialAccountAdapter.__bases__[0], "save_user")
    def test_microsoft_provider_sets_first_and_last_name(self, mock_super_save):
        """Microsoft login should populate first_name/last_name from extra_data."""
        user = User(email="ms@example.com")
        mock_super_save.return_value = user

        sociallogin = self._make_sociallogin("microsoft", {
            "givenName": "John",
            "surname": "Smith",
        })

        result = self.adapter.save_user(self.request, sociallogin)
        self.assertEqual(result.first_name, "John")
        self.assertEqual(result.last_name, "Smith")

    @patch.object(CustomSocialAccountAdapter.__bases__[0], "save_user")
    def test_google_missing_fields_default_to_empty(self, mock_super_save):
        """Missing Google name fields should default to empty strings."""
        user = User(email="empty@example.com")
        mock_super_save.return_value = user

        sociallogin = self._make_sociallogin("google", {})

        result = self.adapter.save_user(self.request, sociallogin)
        self.assertEqual(result.first_name, "")
        self.assertEqual(result.last_name, "")

    @patch.object(CustomSocialAccountAdapter.__bases__[0], "save_user")
    def test_unknown_provider_does_not_crash(self, mock_super_save):
        """An unknown provider should not set name fields (no crash)."""
        user = User(email="other@example.com")
        mock_super_save.return_value = user

        sociallogin = self._make_sociallogin("github", {
            "login": "someuser",
        })

        result = self.adapter.save_user(self.request, sociallogin)
        # first_name / last_name remain as whatever the parent set them to
        self.assertEqual(result.email, "other@example.com")


# ═══════════════════════════════════════════════════════════════════════
#  set_jwt_cookies utility
# ═══════════════════════════════════════════════════════════════════════

class SetJwtCookiesTest(TestCase):
    """Tests for the set_jwt_cookies() helper function."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="cookie@example.com", password="pass123",
            first_name="C", last_name="U",
        )

    def test_sets_access_cookie(self):
        response = HttpResponse()
        response = set_jwt_cookies(response, self.user)
        self.assertIn("access", response.cookies)

    def test_sets_refresh_cookie(self):
        response = HttpResponse()
        response = set_jwt_cookies(response, self.user)
        self.assertIn("refresh", response.cookies)

    def test_access_cookie_is_httponly(self):
        response = HttpResponse()
        response = set_jwt_cookies(response, self.user)
        self.assertTrue(response.cookies["access"]["httponly"])

    def test_refresh_cookie_is_httponly(self):
        response = HttpResponse()
        response = set_jwt_cookies(response, self.user)
        self.assertTrue(response.cookies["refresh"]["httponly"])

    def test_access_cookie_max_age(self):
        """Access cookie should expire in 15 minutes (900 seconds)."""
        response = HttpResponse()
        response = set_jwt_cookies(response, self.user)
        self.assertEqual(response.cookies["access"]["max-age"], 900)

    def test_refresh_cookie_max_age(self):
        """Refresh cookie should expire in 1 day (86400 seconds)."""
        response = HttpResponse()
        response = set_jwt_cookies(response, self.user)
        self.assertEqual(response.cookies["refresh"]["max-age"], 86400)

    def test_cookies_samesite_lax(self):
        response = HttpResponse()
        response = set_jwt_cookies(response, self.user)
        self.assertEqual(response.cookies["access"]["samesite"], "Lax")
        self.assertEqual(response.cookies["refresh"]["samesite"], "Lax")

    def test_cookies_not_secure_in_dev(self):
        """With JWT_AUTH_SECURE=False, cookies should not set Secure flag."""
        response = HttpResponse()
        response = set_jwt_cookies(response, self.user)
        # Django's SimpleCookie stores secure as empty string when False
        self.assertFalse(response.cookies["access"]["secure"])


# ═══════════════════════════════════════════════════════════════════════
#  JWTCookieMiddleware
# ═══════════════════════════════════════════════════════════════════════

class JWTCookieMiddlewareTest(TestCase):
    """Tests for the JWTCookieMiddleware.process_response() logic."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="mw@example.com", password="pass123",
            first_name="M", last_name="W",
        )
        self.middleware = JWTCookieMiddleware(get_response=lambda r: HttpResponse())
        self.factory = RequestFactory()

    def _authenticated_request(self):
        """Build a request that looks like an authenticated OAuth redirect."""
        request = self.factory.get("/")
        request.user = self.user
        session = SessionStore()
        session["_auth_user_id"] = str(self.user.pk)
        session.create()
        request.session = session
        return request

    def test_sets_cookies_on_oauth_redirect(self):
        """Middleware should set JWT cookies on a 302 redirect to LOGIN_REDIRECT_URL."""
        request = self._authenticated_request()
        response = HttpResponseRedirect("http://localhost:5173/")

        result = self.middleware.process_response(request, response)

        self.assertIn("access", result.cookies)
        self.assertIn("refresh", result.cookies)

    def test_does_not_set_cookies_on_non_redirect(self):
        """Middleware should not touch a normal 200 response."""
        request = self._authenticated_request()
        response = HttpResponse()

        result = self.middleware.process_response(request, response)

        self.assertNotIn("access", result.cookies)

    def test_does_not_set_cookies_for_unauthenticated_user(self):
        """Middleware should not set cookies for anonymous users."""
        from django.contrib.auth.models import AnonymousUser
        request = self.factory.get("/")
        request.user = AnonymousUser()
        request.session = SessionStore()
        response = HttpResponseRedirect("http://localhost:5173/")

        result = self.middleware.process_response(request, response)

        self.assertNotIn("access", result.cookies)

    def test_does_not_set_cookies_on_redirect_to_other_url(self):
        """Middleware should not set cookies when redirecting elsewhere."""
        request = self._authenticated_request()
        response = HttpResponseRedirect("http://other-site.com/")

        result = self.middleware.process_response(request, response)

        self.assertNotIn("access", result.cookies)

    def test_does_not_set_cookies_without_session_auth_id(self):
        """Without _auth_user_id in session, middleware should skip."""
        request = self.factory.get("/")
        request.user = self.user
        request.session = SessionStore()  # no _auth_user_id
        response = HttpResponseRedirect("http://localhost:5173/")

        result = self.middleware.process_response(request, response)

        self.assertNotIn("access", result.cookies)


# ═══════════════════════════════════════════════════════════════════════
#  Social Login View Configuration
# ═══════════════════════════════════════════════════════════════════════

class SocialLoginViewConfigTest(TestCase):
    """Tests that social login views are configured correctly."""

    def test_google_login_adapter_class(self):
        self.assertEqual(GoogleLogin.adapter_class, GoogleOAuth2Adapter)

    def test_google_login_callback_url(self):
        self.assertEqual(GoogleLogin.callback_url, "http://localhost:5173/")

    def test_google_login_client_class(self):
        self.assertEqual(GoogleLogin.client_class, OAuth2Client)

    def test_microsoft_login_adapter_class(self):
        self.assertEqual(MicrosoftLogin.adapter_class, MicrosoftGraphOAuth2Adapter)

    def test_microsoft_login_callback_url(self):
        self.assertEqual(MicrosoftLogin.callback_url, "http://localhost:5173/")

    def test_microsoft_login_client_class(self):
        self.assertEqual(MicrosoftLogin.client_class, OAuth2Client)


# ═══════════════════════════════════════════════════════════════════════
#  CustomUserSerializer
# ═══════════════════════════════════════════════════════════════════════

class CustomUserSerializerTest(TestCase):
    """Tests for registration serializer validation and creation."""

    def test_valid_data_creates_user(self):
        data = {
            "email": "new@example.com",
            "password": "strongpass123",
            "first_name": "New",
            "last_name": "User",
        }
        serializer = CustomUserSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertTrue(user.check_password("strongpass123"))

    def test_short_password_rejected(self):
        data = {
            "email": "short@example.com",
            "password": "short",
            "first_name": "S",
            "last_name": "U",
        }
        serializer = CustomUserSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("password", serializer.errors)

    def test_long_bio_rejected(self):
        data = {
            "email": "bio@example.com",
            "password": "validpass123",
            "first_name": "B",
            "last_name": "U",
            "bio": "x" * 501,
        }
        serializer = CustomUserSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("bio", serializer.errors)

    def test_duplicate_email_rejected(self):
        User.objects.create_user(
            email="taken@example.com", password="pass123",
            first_name="T", last_name="U",
        )
        data = {
            "email": "taken@example.com",
            "password": "validpass123",
            "first_name": "D",
            "last_name": "U",
        }
        serializer = CustomUserSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)

    def test_password_is_write_only(self):
        user = User.objects.create_user(
            email="pw@example.com", password="pass123",
            first_name="P", last_name="U",
        )
        serializer = CustomUserSerializer(user)
        self.assertNotIn("password", serializer.data)


# ═══════════════════════════════════════════════════════════════════════
#  CustomTokenObtainPairSerializer
# ═══════════════════════════════════════════════════════════════════════

class CustomTokenObtainPairSerializerTest(TestCase):
    """Tests for the login serializer."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="login@example.com", password="correctpass",
            first_name="L", last_name="U",
        )

    def test_invalid_email_raises_validation_error(self):
        data = {"email": "nonexistent@example.com", "password": "anything"}
        serializer = CustomTokenObtainPairSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_wrong_password_raises_validation_error(self):
        data = {"email": "login@example.com", "password": "wrongpass"}
        serializer = CustomTokenObtainPairSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_correct_credentials_valid(self):
        data = {"email": "login@example.com", "password": "correctpass"}
        serializer = CustomTokenObtainPairSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


# ═══════════════════════════════════════════════════════════════════════
#  AutenticatedUserSerializer
# ═══════════════════════════════════════════════════════════════════════

class AutenticatedUserSerializerTest(TestCase):
    """Tests for the authenticated user serializer."""

    def test_serializer_fields(self):
        user = User.objects.create_user(
            email="me@example.com", password="pass123",
            first_name="Me", last_name="User", bio="Hello!",
        )
        serializer = AutenticatedUserSerializer(user)
        self.assertEqual(set(serializer.data.keys()), {"email", "first_name", "last_name", "bio"})
        self.assertEqual(serializer.data["email"], "me@example.com")
        self.assertEqual(serializer.data["bio"], "Hello!")


# ═══════════════════════════════════════════════════════════════════════
#  AuthenticatedUserView (API endpoint)
# ═══════════════════════════════════════════════════════════════════════

class AuthenticatedUserViewTest(TestCase):
    """Tests for the /api/accounts/me/ endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="view@example.com", password="pass123",
            first_name="View", last_name="User",
        )

    def test_unauthenticated_returns_401(self):
        response = self.client.get("/api/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_returns_user_data(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "view@example.com")
        self.assertEqual(response.data["first_name"], "View")

    def test_authenticated_does_not_expose_password(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/accounts/me/")
        self.assertNotIn("password", response.data)


# ═══════════════════════════════════════════════════════════════════════
#  Custom Exception Handler
# ═══════════════════════════════════════════════════════════════════════

class CustomExceptionHandlerTest(TestCase):
    """Tests for the custom DRF exception handler."""

    def test_401_response_format(self):
        from rest_framework.exceptions import NotAuthenticated
        exc = NotAuthenticated()
        context = {}
        response = custom_exception_handler(exc, context)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["message"], "Unauthorized")
        self.assertEqual(response.data["action"], "redirect_to_login")
        self.assertTrue(response.data["error"])

    def test_403_response_format(self):
        from rest_framework.exceptions import PermissionDenied
        exc = PermissionDenied()
        context = {}
        response = custom_exception_handler(exc, context)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["message"], "Forbidden")
        self.assertEqual(response.data["action"], "show_error")

    def test_404_response_contains_status_code(self):
        from rest_framework.exceptions import NotFound
        exc = NotFound()
        context = {}
        response = custom_exception_handler(exc, context)
        self.assertEqual(response.data["status_code"], 404)
        self.assertTrue(response.data["error"])

    def test_non_drf_exception_returns_none(self):
        """Standard Python exceptions should pass through (return None)."""
        exc = ValueError("not a DRF exception")
        context = {}
        response = custom_exception_handler(exc, context)
        self.assertIsNone(response)
