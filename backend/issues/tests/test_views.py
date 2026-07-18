from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from issues.models import Issue, IssueAssignee, IssueChoices, Label
from repositories.models import Repository, RepositoryMember


User = get_user_model()


class IssueViewSetFilterAndUpdateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="pass123",
            first_name="Owner",
            last_name="User",
        )
        self.collaborator = User.objects.create_user(
            email="collab@example.com",
            password="pass123",
            first_name="Collab",
            last_name="User",
        )
        self.repo = Repository.objects.create(
            name="Issue View Repo",
            owner=self.owner,
            description="Repository for issue view tests",
        )
        RepositoryMember.objects.create(
            developer=self.owner,
            repository=self.repo,
            role=RepositoryMember.Role.REPO_ADMIN,
        )
        RepositoryMember.objects.create(
            developer=self.collaborator,
            repository=self.repo,
            role=RepositoryMember.Role.MEMBER,
        )
        self.client.force_authenticate(user=self.owner)

        self.label_bug = Label.objects.create(
            repo=self.repo,
            name="bug",
            color="#ff0000",
            description="Bug label",
        )
        self.label_docs = Label.objects.create(
            repo=self.repo,
            name="docs",
            color="#00ff00",
            description="Docs label",
        )

        self.issue_open = Issue.objects.create(
            repo=self.repo,
            title="Open issue",
            description="Needs attention",
            status=IssueChoices.OPEN,
            creator=self.owner,
        )
        self.issue_open.labels.add(self.label_bug)

        self.issue_progress = Issue.objects.create(
            repo=self.repo,
            title="In progress issue",
            description="Actively being worked on",
            status=IssueChoices.IN_PROGRESS,
            creator=self.owner,
        )
        self.issue_progress.labels.add(self.label_docs)
        IssueAssignee.objects.create(issue=self.issue_progress, assignee=self.collaborator)

        self.issue_closed = Issue.objects.create(
            repo=self.repo,
            title="Closed issue",
            description="Finished work",
            status=IssueChoices.CLOSED,
            creator=self.owner,
        )

    def test_list_can_filter_by_status_list(self):
        response = self.client.get(
            f"/api/repositories/{self.repo.slug}/issues/",
            {"status": "open,in_progress"},
        )

        self.assertEqual(response.status_code, 200)
        returned_ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(returned_ids, {self.issue_open.id, self.issue_progress.id})

    def test_list_can_filter_by_label(self):
        response = self.client.get(
            f"/api/repositories/{self.repo.slug}/issues/",
            {"label": self.label_bug.id},
        )

        self.assertEqual(response.status_code, 200)
        returned_ids = [item["id"] for item in response.data["results"]]
        self.assertEqual(returned_ids, [self.issue_open.id])

    def test_list_can_filter_by_assignee(self):
        response = self.client.get(
            f"/api/repositories/{self.repo.slug}/issues/",
            {"assignee": self.collaborator.id},
        )

        self.assertEqual(response.status_code, 200)
        returned_ids = [item["id"] for item in response.data["results"]]
        self.assertEqual(returned_ids, [self.issue_progress.id])

    def test_partial_update_status_returns_updated_issue(self):
        response = self.client.patch(
            f"/api/repositories/{self.repo.slug}/issues/{self.issue_open.id}/",
            {"status": IssueChoices.CLOSED},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], IssueChoices.CLOSED)

        self.issue_open.refresh_from_db()
        self.assertEqual(self.issue_open.status, IssueChoices.CLOSED)
