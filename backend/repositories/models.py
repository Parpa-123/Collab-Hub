from django.db import models
from common.models import CommonModel
from config.settings import AUTH_USER_MODEL
from django.utils.text import slugify

class Repository(CommonModel):
    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        PRIVATE = "private", "Private"
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="repositories")
    slug = models.SlugField(max_length=255, unique=True, blank=True, null=True)
    description = models.TextField()
    visibility = models.CharField(max_length=255, choices=Visibility.choices, default=Visibility.PRIVATE)
    default_branch = models.CharField(max_length=255, default="main")


    class Meta:
        unique_together = ("name", "owner")
        verbose_name = "Repository"
        verbose_name_plural = "Repositories"

    def __str__(self):
        return f"{self.name} - {self.visibility}"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

class RepositoryMember(CommonModel):
    class Role(models.TextChoices):
        REPO_ADMIN = "admin", "Admin"
        MAINTAINER = "maintainer", "Maintainer"
        MEMBER = "member", "Member"

    developer = models.ForeignKey(AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="repositoryMembers")
    repository = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name="repositoryMembers")
    role = models.CharField(max_length=255, choices=Role.choices, default=Role.MEMBER)

    class Meta:
        unique_together = ("developer", "repository")
        verbose_name = "Repository Member"
        verbose_name_plural = "Repository Members"
    
    def __str__(self):
        return f"{self.developer} - {self.repository} - {self.role}"