from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from common.models import CommonModel

User = get_user_model()

class Comment(CommonModel):
    
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')

    SIDE_CHOICES = (
        ("old", "Old"),
        ("new", "New"),
    )
    path = models.TextField(null=True, blank=True)
    line_number = models.IntegerField(null=True, blank=True)
    side = models.CharField(max_length=10, choices=SIDE_CHOICES, null=True, blank=True)

    def __str__(self):
        return f'Comment by {self.author} on {self.content_object}'

    
