from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
import uuid

from repositories.models import Repository, RepositoryMember
from branches.models import Branches, Commit
from PullRequest.models import PullRequest
from issues.models import Issue
from issues.serializers import IssueSerializer
from storage.models import Blob
from storage.services.diff_services import generate_diff

User = get_user_model()


@override_settings(
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
    CELERY_TASK_ALWAYS_EAGER=True
)
class LogicImprovementsTest(TestCase):
    def setUp(self):
        self.patcher_broadcast = patch("issues.views.broadcast_issue_event")
        self.patcher_dispatch = patch("config.events.dispatcher.dispatch_event")
        self.mock_broadcast = self.patcher_broadcast.start()
        self.mock_dispatch = self.patcher_dispatch.start()
        self.addCleanup(self.patcher_broadcast.stop)
        self.addCleanup(self.patcher_dispatch.stop)

        self.client = APIClient()
        self.user = User.objects.create_user(
            email="developer@example.com",
            password="pass123",
            first_name="Dev",
            last_name="User",
        )
        self.client.force_authenticate(user=self.user)

        self.repo = Repository.objects.create(
            name="Test Repo",
            owner=self.user,
            description="Testing logic improvements",
            visibility=Repository.Visibility.PRIVATE,
        )
        self.member = RepositoryMember.objects.create(
            developer=self.user,
            repository=self.repo,
            role=RepositoryMember.Role.REPO_ADMIN,
        )

        self.main_branch = Branches.objects.create(
            name="main",
            repository=self.repo,
            created_by=self.user,
        )
        self.feature_branch = Branches.objects.create(
            name="feature",
            repository=self.repo,
            created_by=self.user,
        )

        self.blob_a = Blob.objects.create(content="Line 1\nLine 2\n")
        self.blob_b = Blob.objects.create(content="Line 1\nLine 2 Modified\n")

        self.base_commit = Commit.objects.create(
            repository=self.repo,
            branch=self.main_branch,
            message="Base commit",
            author=self.user,
            snapshot={"file1.txt": str(self.blob_a.id), "file2.txt": str(self.blob_b.id)},
        )
        self.head_commit = Commit.objects.create(
            repository=self.repo,
            branch=self.feature_branch,
            message="Head commit",
            parent=self.base_commit,
            author=self.user,
            snapshot={"file1.txt": str(self.blob_a.id)}, # file2.txt deleted in head
        )

        self.main_branch.head_commit = self.base_commit
        self.main_branch.save()

        self.feature_branch.head_commit = self.head_commit
        self.feature_branch.save()

    def test_diff_services_same_blob_fast_path(self):
        c1 = Commit.objects.create(
            repository=self.repo,
            branch=self.main_branch,
            message="c1",
            author=self.user,
            snapshot={"same.txt": str(self.blob_a.id)},
        )
        c2 = Commit.objects.create(
            repository=self.repo,
            branch=self.main_branch,
            message="c2",
            author=self.user,
            snapshot={"same.txt": str(self.blob_a.id)},
        )
        res = generate_diff(c1, c2)
        self.assertEqual(res["files"], [])

    def test_diff_services_missing_blob_safeguard(self):
        missing_id = str(uuid.uuid4())
        c1 = Commit.objects.create(
            repository=self.repo,
            branch=self.main_branch,
            message="c1",
            author=self.user,
            snapshot={"missing.txt": missing_id},
        )
        c2 = Commit.objects.create(
            repository=self.repo,
            branch=self.main_branch,
            message="c2",
            author=self.user,
            snapshot={"missing.txt": str(self.blob_a.id)},
        )
        res = generate_diff(c1, c2)
        self.assertEqual(len(res["files"]), 1)
        self.assertEqual(res["files"][0]["status"], "error")

    def test_pr_merge_preserves_file_deletions(self):
        pr = PullRequest.objects.create(
            repo=self.repo,
            title="Delete file2 PR",
            source_branch=self.feature_branch,
            target_branch=self.main_branch,
            base_commit=self.base_commit,
            created_by=self.user,
            status="OPEN",
        )

        response = self.client.post(
            f"/api/repositories/{self.repo.slug}/pull-requests/{pr.id}/merge/"
        )
        self.assertEqual(response.status_code, 200)

        self.main_branch.refresh_from_db()
        merged_commit = self.main_branch.head_commit

        self.assertIn("file1.txt", merged_commit.snapshot)
        self.assertNotIn("file2.txt", merged_commit.snapshot)

    def test_pr_reopen_invalidates_precomputed_diff(self):
        pr = PullRequest.objects.create(
            repo=self.repo,
            title="Reopen Test PR",
            source_branch=self.feature_branch,
            target_branch=self.main_branch,
            base_commit=self.base_commit,
            created_by=self.user,
            status="CLOSED",
            precomputed_diff=[{"file_path": "file2.txt", "status": "removed"}],
            diff_status="READY",
        )

        response = self.client.post(
            f"/api/repositories/{self.repo.slug}/pull-requests/{pr.id}/reopen/"
        )
        self.assertEqual(response.status_code, 200)

        pr.refresh_from_db()
        self.assertEqual(pr.status, "OPEN")
        self.assertIsNone(pr.precomputed_diff)
        self.assertEqual(pr.diff_status, "PROCESSING")

    def test_issue_assign_rejects_non_repo_member(self):
        issue = Issue.objects.create(
            repo=self.repo,
            creator=self.user,
            title="Bug issue",
        )
        non_member = User.objects.create_user(
            email="outsider@example.com",
            password="pass123",
            first_name="Outsider",
            last_name="User",
        )

        response = self.client.post(
            f"/api/repositories/{self.repo.slug}/issues/{issue.id}/assign/",
            {"assignee_id": non_member.id},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("not a member", response.data["error"])

    def test_issue_parent_self_and_circular_validation(self):
        issue1 = Issue.objects.create(
            repo=self.repo,
            creator=self.user,
            title="Issue 1",
        )
        issue2 = Issue.objects.create(
            repo=self.repo,
            creator=self.user,
            title="Issue 2",
            parent=issue1,
        )

        serializer = IssueSerializer(
            instance=issue1,
            data={"parent": issue1.id, "title": "Issue 1"},
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("cannot be its own parent", str(serializer.errors))

        serializer_cycle = IssueSerializer(
            instance=issue1,
            data={"parent": issue2.id, "title": "Issue 1"},
            partial=True,
        )
        self.assertFalse(serializer_cycle.is_valid())
        self.assertIn("Circular parent issue relationship detected", str(serializer_cycle.errors))
