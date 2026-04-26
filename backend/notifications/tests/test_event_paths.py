from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from branches.models import Branches
from notifications.models import Notification
from PullRequest.models import PullRequest
from repositories.models import Repository, RepositoryMember

User = get_user_model()


class NotificationEventPathsTest(APITestCase):
    @staticmethod
    def _run_notification_task_inline(task, *args, **kwargs):
        task.apply(args=args, kwargs=kwargs)

    def setUp(self):
        self.owner = User.objects.create_user(email="owner@test.com", password="password")
        self.reviewer = User.objects.create_user(email="reviewer@test.com", password="password")
        self.collaborator = User.objects.create_user(email="collab@test.com", password="password")

        self.repo = Repository.objects.create(
            name="events-repo",
            description="repo for notification event path tests",
            owner=self.owner,
        )
        RepositoryMember.objects.create(
            repository=self.repo,
            developer=self.owner,
            role=RepositoryMember.Role.REPO_ADMIN,
        )
        RepositoryMember.objects.create(
            repository=self.repo,
            developer=self.reviewer,
            role=RepositoryMember.Role.MEMBER,
        )
        RepositoryMember.objects.create(
            repository=self.repo,
            developer=self.collaborator,
            role=RepositoryMember.Role.MEMBER,
        )

        self.main_branch = Branches.objects.create(
            name="main",
            repository=self.repo,
            created_by=self.owner,
            is_default=True,
        )
        self.feature_branch = Branches.objects.create(
            name="feature",
            repository=self.repo,
            created_by=self.owner,
        )

        self.pr = PullRequest.objects.create(
            repo=self.repo,
            source_branch=self.feature_branch,
            target_branch=self.main_branch,
            title="Event Coverage",
            description="Ensure event paths are wired",
            created_by=self.owner,
        )

    def test_create_review_emits_review_notification(self):
        self.client.force_authenticate(user=self.reviewer)

        with patch("notifications.handlers.enqueue_notification_task") as mock_enqueue, patch(
            "activity.handlers.log_activity.delay"
        ) as _mock_activity_delay:
            mock_enqueue.side_effect = self._run_notification_task_inline
            response = self.client.post(
                f"/api/repositories/{self.repo.slug}/pull-requests/{self.pr.id}/reviews/",
                {"status": "APPROVED"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.owner,
                actor=self.reviewer,
                object_id=self.pr.id,
                verb="approved your pull request",
            ).exists()
        )

    def test_reopen_pr_emits_reopen_notification(self):
        self.pr.status = "CLOSED"
        self.pr.save(update_fields=["status", "updated_at"])

        self.client.force_authenticate(user=self.owner)
        with patch("notifications.handlers.enqueue_notification_task") as mock_enqueue, patch(
            "PullRequest.handlers.trigger_diff_generation"
        ) as _mock_trigger_diff:
            mock_enqueue.side_effect = self._run_notification_task_inline
            response = self.client.post(
                f"/api/repositories/{self.repo.slug}/pull-requests/{self.pr.id}/reopen/"
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.collaborator,
                actor=self.owner,
                object_id=self.pr.id,
                verb="reopened a pull request",
            ).exists()
        )
