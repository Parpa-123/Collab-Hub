from django.db import models
import uuid
import hashlib
# Create your models here.


class Blob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.TextField()
    content_hash = models.CharField(max_length=64, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        self.content_hash = hashlib.sha256(self.content.encode()).hexdigest()
        super().save(*args, **kwargs)


class Tree(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    commit = models.OneToOneField('branches.Commit', on_delete=models.CASCADE, related_name='tree')
    created_at = models.DateTimeField(auto_now_add=True)
    
class TreeNode(models.Model):
    TYPE_CHOICES = (
        ('file','File'),
        ('dir','Directory')
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tree = models.ForeignKey(Tree, on_delete=models.CASCADE, related_name='nodes', null=True, blank=True)
    name = models.CharField(max_length=255)
    path = models.TextField()
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    blob = models.ForeignKey(Blob, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)