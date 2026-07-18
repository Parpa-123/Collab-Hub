from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch

from PullRequest.models import PullRequest, PullRequestViewedFile
from branches.models import Branches, Commit
from repositories.models import Repository, RepositoryMember

User = get_user_model()


class PullRequestViewSetDraftAndViewedFilesTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.owner = User.objects.create_user(
            email="owner-pr@example.com",
            password="pass123",
            first_name="Owner",
            last_name="PR",
        )
        self.member = User.objects.create_user(
            email="member-pr@example.com",
            password="pass123",
            first_name="Member",
            last_name="PR",
        )

        self.repo = Repository.objects.create(
            name="PR API Repo",
            owner=self.owner,
            description="Repository for pull request API tests",
        )
        RepositoryMember.objects.create(
            developer=self.owner,
            repository=self.repo,
            role=RepositoryMember.Role.REPO_ADMIN,
        )
        RepositoryMember.objects.create(
            developer=self.member,
            repository=self.repo,
            role=RepositoryMember.Role.MEMBER,
        )

        self.main = Branches.objects.create(
            name="main",
            repository=self.repo,
            is_default=True,
            is_protected=False,
            created_by=self.owner,
        )
        self.feature = Branches.objects.create(
            name="feature",
            repository=self.repo,
            created_by=self.owner,
            created_from=self.main,
        )

        self.main_commit = Commit.objects.create(
            repository=self.repo,
            branch=self.main,
            message="main base",
            author=self.owner,
            snapshot={},
        )
        self.feature_commit = Commit.objects.create(
            repository=self.repo,
            branch=self.feature,
            parent=self.main_commit,
            message="feature work",
            author=self.owner,
            snapshot={"README.md": "hello"},
        )
        self.main.head_commit = self.main_commit
        self.main.save(update_fields=["head_commit"])
        self.feature.head_commit = self.feature_commit
        self.feature.save(update_fields=["head_commit"])

        self.client.force_authenticate(user=self.owner)
        self.base_url = f"/api/repositories/{self.repo.slug}/pull-requests/"

    def _create_pr(self, *, is_draft=False):
        with (
            patch("PullRequest.tasks.trigger_diff_generation", return_value=None),
            patch("PullRequest.views.dispatch_event", return_value=None),
        ):
            response = self.client.post(
                self.base_url,
                {
                    "title": "Add feature",
                    "description": "Implements feature work",
                    "source_branch": self.feature.id,
                    "target_branch": self.main.id,
                    "is_draft": is_draft,
                },
                format="json",
            )
        self.assertEqual(response.status_code, 201)
        return response.data["id"]

    def test_create_pr_accepts_is_draft(self):
        pr_id = self._create_pr(is_draft=True)
        pr = PullRequest.objects.get(pk=pr_id)

        self.assertTrue(pr.is_draft)

    def test_ready_for_review_and_convert_to_draft_actions(self):
        pr_id = self._create_pr(is_draft=True)

        ready_response = self.client.post(f"{self.base_url}{pr_id}/ready-for-review/")
        self.assertEqual(ready_response.status_code, 200)
        self.assertEqual(ready_response.data["status"], "ready_for_review")

        convert_response = self.client.post(f"{self.base_url}{pr_id}/convert-to-draft/")
        self.assertEqual(convert_response.status_code, 200)
        self.assertEqual(convert_response.data["status"], "converted_to_draft")

        pr = PullRequest.objects.get(pk=pr_id)
        self.assertTrue(pr.is_draft)

    def test_merge_is_blocked_while_pr_is_draft(self):
        pr_id = self._create_pr(is_draft=True)

        response = self.client.post(f"{self.base_url}{pr_id}/merge/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("draft", response.data.get("error", "").lower())

    def test_viewed_files_patch_is_idempotent_for_same_file(self):
        pr_id = self._create_pr()
        endpoint = f"{self.base_url}{pr_id}/viewed-files/"

        first = self.client.patch(
            endpoint,
            {"file_path": "src/app.py", "viewed": True},
            format="json",
        )
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.data["viewed"])

        second = self.client.patch(
            endpoint,
            {"file_path": "src/app.py", "viewed": False},
            format="json",
        )
        self.assertEqual(second.status_code, 200)
        self.assertFalse(second.data["viewed"])

        self.assertEqual(
            PullRequestViewedFile.objects.filter(
                pr_id=pr_id, user=self.owner, file_path="src/app.py"
            ).count(),
            1,
        )

    def test_viewed_files_are_isolated_per_user(self):
        pr_id = self._create_pr()
        endpoint = f"{self.base_url}{pr_id}/viewed-files/"

        owner_patch = self.client.patch(
            endpoint,
            {"file_path": "README.md", "viewed": True},
            format="json",
        )
        self.assertEqual(owner_patch.status_code, 200)

        self.client.force_authenticate(user=self.member)
        member_patch = self.client.patch(
            endpoint,
            {"file_path": "README.md", "viewed": False},
            format="json",
        )
        self.assertEqual(member_patch.status_code, 200)

        owner_entry = PullRequestViewedFile.objects.get(
            pr_id=pr_id, user=self.owner, file_path="README.md"
        )
        member_entry = PullRequestViewedFile.objects.get(
            pr_id=pr_id, user=self.member, file_path="README.md"
        )
        self.assertTrue(owner_entry.viewed)
        self.assertFalse(member_entry.viewed)

        member_list = self.client.get(endpoint)
        self.assertEqual(member_list.status_code, 200)
        self.assertEqual(member_list.data[0]["viewed"], False)

        self.client.force_authenticate(user=self.owner)
        owner_list = self.client.get(endpoint)
        self.assertEqual(owner_list.status_code, 200)
        self.assertEqual(owner_list.data[0]["viewed"], True)
