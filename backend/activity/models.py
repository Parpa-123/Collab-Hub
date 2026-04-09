from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from common.models import CommonModel
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from repositories.models import Repository

User = get_user_model()

class Activity(CommonModel):
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activities")
    verb = models.CharField(max_length=255, default='', blank=True)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    repo = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name="activities")

    class Meta:
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self):
        return f"{self.actor} {self.verb} {self.content_object}"