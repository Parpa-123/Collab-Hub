from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

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