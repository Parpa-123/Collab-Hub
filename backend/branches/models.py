from django.db import models
from django.contrib.auth import get_user_model
from common.models import CommonModel
from django.contrib.contenttypes.fields import GenericRelation

User = get_user_model()


class Branches(CommonModel):
    name = models.CharField(max_length=100)
    repository = models.ForeignKey('repositories.Repository', on_delete=models.CASCADE, related_name='branches')
    is_default = models.BooleanField(default=False)
    is_protected = models.BooleanField(default=False)
    created_by = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE)
    created_from = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    head_commit = models.ForeignKey("Commit", on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.repository.name}"

    class Meta:
        verbose_name = 'Branch'
        verbose_name_plural = 'Branches'
        unique_together = ('name', 'repository')


class Commit(CommonModel):

    repository = models.ForeignKey(
        'repositories.Repository',
        on_delete=models.CASCADE,
        related_name="commits"
    )

    branch = models.ForeignKey(
        Branches,
        on_delete=models.CASCADE,
        related_name="commits"
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children"
    )

    second_parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="merge_children"
    )

    message = models.CharField(max_length=255)

    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="commits"
    )

    snapshot = models.JSONField(
        null=True,
        blank=True
    )

    comments = GenericRelation("comments.Comment",related_name="comments")

    def __str__(self):
        return f"Commit {self.id} on {self.branch.name}"

    class Meta:
        ordering = ["-created_at"]

