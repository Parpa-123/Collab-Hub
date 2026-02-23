from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from common.models import CommonModel
from branches.models import Branches
from repositories.models import Repository

User = get_user_model()


class PullRequest(CommonModel):

    STATUS_CHOICES = [
        ("OPEN", "Open"),
        ("MERGED", "Merged"),
        ("CLOSED", "Closed"),
    ]

    base_commit = models.ForeignKey(
        "branches.Commit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="base_for_prs"
    )

    repo = models.ForeignKey(
        Repository,
        on_delete=models.CASCADE,
        related_name="pull_requests"
    )

    source_branch = models.ForeignKey(
        Branches,
        on_delete=models.CASCADE,
        related_name="source_pull_requests",
        null=True,
        blank=True
    )

    target_branch = models.ForeignKey(
        Branches,
        on_delete=models.CASCADE,
        related_name="target_pull_requests",
        null=True,
        blank=True
    )

    title = models.CharField(max_length=100)
    description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="OPEN"
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_pull_requests"
    )

    merged_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="merged_pull_requests",
        null=True,
        blank=True
    )

    merged_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    source_name = models.CharField(max_length=100, null=True, blank=True)
    target_name = models.CharField(max_length=100, null=True, blank=True)

    @property
    def source_branch_deleted(self):
        return self.source_branch is None and self.source_name != "main"

    @property
    def target_branch_deleted(self):
        return self.target_branch is None and self.target_name != "main"

    @property
    def has_conflicts(self):
        """Checks if the target branch has moved since the PR was created."""
        if not self.target_branch or not self.target_branch.head_commit:
            return False
        return self.base_commit != self.target_branch.head_commit

    @property
    def is_mergeable(self):
        if self.status != "OPEN":
            return False

        if self.source_branch_deleted or self.target_branch_deleted:
            return False

        if self.has_conflicts:
            return False

        # Must have at least one approval and NO changes requested
        approvals = self.reviews.filter(status="APPROVED").count()
        has_changes_requested = self.reviews.filter(status="CHANGES_REQUESTED").exists()

        return approvals >= 1 and not has_changes_requested

    @property
    def can_close(self):
        return self.status == "OPEN"

    @property
    def can_reopen(self):
        return self.status == "CLOSED"

    def clean(self):

        if self.source_branch == self.target_branch:
            raise ValidationError(
                "Source and target branches cannot be the same."
            )

        if self.source_branch and self.target_branch:
            if self.source_branch.repository != self.target_branch.repository:
                raise ValidationError(
                    "Source and target branches must belong to the same repository."
                )

    def save(self, *args, **kwargs):

        if self.source_branch:
            self.source_name = self.source_branch.name

        if self.target_branch:
            self.target_name = self.target_branch.name

        super().save(*args, **kwargs)

    def __str__(self):
        return f"PR #{self.id}: {self.title}"

    class Meta:
        unique_together = ("repo", "source_branch", "target_branch")

class Review(CommonModel):

    REVIEW_STATUS = [
        ("APPROVED", "Approved"),
        ("CHANGES_REQUESTED", "Changes Requested"),
        ("COMMENTED", "Commented"),
    ]

    pr = models.ForeignKey(
        PullRequest,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    reviewer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="given_reviews"
    )

    status = models.CharField(
        max_length=20,
        choices=REVIEW_STATUS
    )

    comment = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Review #{self.id} on PR #{self.pr.id}"

    class Meta:
        unique_together = ("pr", "reviewer")