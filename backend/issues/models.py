from django.db import models
from common.models import CommonModel
from repositories.models import Repository
from accounts.models import CustomUser
from django.contrib.contenttypes.fields import GenericRelation


class IssueChoices(models.TextChoices):
    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In Progress"
    CLOSED = "closed", "Closed"

class Label(CommonModel):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7)
    description = models.TextField()
    repo = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name="labels", null=True)

    def __str__(self):
        return self.name


class Issue(CommonModel):
    repo = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name="issues")
    title = models.CharField(max_length=100)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=IssueChoices.choices)
    labels = models.ManyToManyField(Label, blank=True)
    creator = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="created_issues")
    assignees = models.ManyToManyField(CustomUser, related_name="issues", through="IssueAssignee")
    parent = models.ForeignKey("self", on_delete=models.CASCADE, related_name="children", null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    comments = GenericRelation("comments.Comment",related_name="comments")
    
    def __str__(self):
        return self.title

class IssueAssignee(CommonModel):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name="issue_assignees")
    assignee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="assigned_issues")
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.issue} - {self.assignee}"