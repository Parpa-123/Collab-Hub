from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings


class JWTCookieMiddleware(MiddlewareMixin):
    """
    Middleware that sets JWT cookies after successful OAuth login.
    It detects when allauth redirects to LOGIN_REDIRECT_URL after login
    and injects JWT tokens as cookies.
    """
    
    def process_response(self, request, response):
        # Check if this is a redirect after OAuth login
        # The user will be authenticated but won't have JWT cookies yet
        if (
            response.status_code == 302 
            and request.user.is_authenticated 
            and hasattr(request, 'session')
            and request.session.get('_auth_user_id')
        ):
            # Check if we're redirecting to the frontend (LOGIN_REDIRECT_URL)
            redirect_to = response.get('Location', '')
            login_redirect = getattr(settings, 'LOGIN_REDIRECT_URL', '')
            
            if redirect_to.startswith(login_redirect) or redirect_to == login_redirect:
                # This is a redirect after OAuth login - set JWT cookies
                response = self._set_jwt_cookies(response, request.user)
        
        return response
    
    def _set_jwt_cookies(self, response, user):
        """Set JWT access and refresh tokens as HTTP-only cookies."""
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Get cookie settings from REST_AUTH
        rest_auth = getattr(settings, 'REST_AUTH', {})
        access_cookie_name = rest_auth.get('JWT_AUTH_COOKIE', 'access')
        refresh_cookie_name = rest_auth.get('JWT_AUTH_REFRESH_COOKIE', 'refresh')
        httponly = rest_auth.get('JWT_AUTH_HTTPONLY', True)
        samesite = rest_auth.get('JWT_AUTH_SAMESITE', 'Lax')
        secure = rest_auth.get('JWT_AUTH_SECURE', False)
        
        # Set access token cookie
        response.set_cookie(
            access_cookie_name,
            access_token,
            httponly=httponly,
            samesite=samesite,
            secure=secure,
            max_age=60 * 15,  # 15 minutes
        )
        
        # Set refresh token cookie
        response.set_cookie(
            refresh_cookie_name,
            refresh_token,
            httponly=httponly,
            samesite=samesite,
            secure=secure,
            max_age=60 * 60 * 24,  # 1 day
        )
        
        return response
