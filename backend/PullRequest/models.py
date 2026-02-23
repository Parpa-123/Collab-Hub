from django.db import models
from common.models import CommonModel
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from branches.models import Branches
from repositories.models import Repository


User = get_user_model()

class PullRequest(CommonModel):
    
    STATUS_CHOICES = [
        ("OPEN", "Open"),
        ('APPROVED', 'Approved'),
        ('CHANGES_REQUESTED', 'Changes Requested'),
        ('MERGED', 'Merged'),
        ('CLOSED', 'Closed'),

    ]

    repo = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name="pull_requests")
    source_branch = models.ForeignKey(Branches, on_delete=models.CASCADE, related_name="source_pull_requests", null=True, blank=True)
    target_branch = models.ForeignKey(Branches, on_delete=models.CASCADE, related_name="target_pull_requests", null=True, blank=True)
    title = models.CharField(max_length=100)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_pull_requests")
    merged_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="closed_pull_requests", null=True, blank=True)
    merged_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    source_name = models.CharField(max_length=100,null=True,blank=True)
    target_name = models.CharField(max_length=100,null=True,blank=True)

    @property
    def source_branch_deleted(self):
        return self.source_branch is None and self.source_name != "main"
    
    @property
    def target_branch_deleted(self):
        return self.target_branch is None and self.target_name != "main"

    @property
    def can_merge(self):
        if self.status != "OPEN":
            return False
        if self.source_branch_deleted:
            return False
        if self.target_branch_deleted:
            return False
        return True

    @property
    def can_close(self):
        if self.status == "CLOSED":
            return False
        return True

    @property
    def can_reopen(self):
        if self.status == "OPEN":
            return False
        return True

    
    def __str__(self):
        return f"PR #{self.id}: {self.title}"

    def clean(self):
        if self.source_branch == self.target_branch:
            raise ValidationError("Source and target branches cannot be the same.")
        if self.source_branch.repository != self.target_branch.repository:
            raise ValidationError("Source and target branches must belong to the same repository.")

    def save(self, *args, **kwargs):
        if self.source_branch:
            self.source_name = self.source_branch.name
        if self.target_branch:
            self.target_name = self.target_branch.name
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ('repo', 'source_branch', 'target_branch')

    

class Review(CommonModel):
    REVIEW_STATUS = [
        ("APPROVED", "Approved"),
        ("CHANGES_REQUESTED", "Changes Requested"),
        ("COMMENTED", "Commented"),

    ]

    pr = models.ForeignKey(PullRequest, on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    status = models.CharField(max_length=20, choices=REVIEW_STATUS)
    comment = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"Review #{self.id} on PR #{self.pr.id} by {self.reviewer.email}"

    @property
    def can_approve(self):
        if self.reviewer == self.pr.created_by:
            return False
        if self.status == "APPROVED":
            return False
        return True
    
    class Meta:
        unique_together = ('pr', 'reviewer')
    

class PullRequestComment(CommonModel):
    pr = models.ForeignKey(PullRequest, on_delete=models.CASCADE, related_name="comments")
    commenter = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pr_comments")
    comment = models.TextField()
    parent_comment = models.ForeignKey("self", on_delete=models.CASCADE, related_name="replies", null=True, blank=True)

    def __str__(self):
        return f"Comment #{self.id} on PR #{self.pr.id} by {self.commenter.email}"

    class Meta:
        unique_together = ('pr', 'commenter', 'comment')    