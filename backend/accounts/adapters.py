from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.signals import social_account_added, social_account_updated
from django.dispatch import receiver
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form)
        # Add any additional logic here if needed
        data = sociallogin.account.extra_data
        if sociallogin.account.provider == "google":
            user.first_name = data.get("given_name", "")
            user.last_name = data.get("family_name", "")
        elif sociallogin.account.provider == "microsoft":
            user.first_name = data.get("givenName", "")
            user.last_name = data.get("surname", "")

        user.save()
        
        return user


def set_jwt_cookies(response, user):
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