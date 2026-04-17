from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from unittest.mock import patch

from comments.models import Comment
from issues.models import Issue, IssueAssignee, IssueChoices
from notifications.models import Notification
from notifications.tasks import notify_generic_comment, notify_pr_created
from repositories.models import Repository, RepositoryMember

User = get_user_model()


class NotificationTasksTest(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(email="actor@test.com", password="password")
        self.recipient = User.objects.create_user(email="recipient@test.com", password="password")
        self.repo = Repository.objects.create(
            name="testrepo",
            description="test repository",
            owner=self.actor,
        )
        RepositoryMember.objects.create(
            developer=self.recipient,
            repository=self.repo,
        )

    @patch('notifications.tasks.Notification.objects.bulk_create')
    def test_notify_pr_created(self, mock_bulk_create):
        content_type = ContentType.objects.get_for_model(self.repo)

        class FakePR:
            id = 3
            repo = self.repo
            created_by = self.actor

        with patch('notifications.tasks.PullRequest.objects.select_related') as mock_pr:
            with patch('notifications.tasks.ContentType.objects.get_for_model', return_value=content_type):
                mock_pr.return_value.get.return_value = FakePR()

                notify_pr_created.run(3)

        self.assertTrue(mock_bulk_create.called)
        notifications_list = mock_bulk_create.call_args.args[0]
        self.assertEqual(len(notifications_list), 1)
        self.assertEqual(notifications_list[0].verb, "created a pull request")
        self.assertEqual(notifications_list[0].recipient, self.recipient)

    def test_notify_generic_comment_notifies_issue_assignees(self):
        assignee = User.objects.create_user(email="assignee@test.com", password="password")
        issue = Issue.objects.create(
            repo=self.repo,
            title="Broken notifications",
            description="Investigate missing notifications",
            status=IssueChoices.OPEN,
            creator=self.actor,
        )
        IssueAssignee.objects.create(issue=issue, assignee=assignee)

        comment = Comment.objects.create(
            author=self.recipient,
            content="I am looking into it.",
            content_type=ContentType.objects.get_for_model(issue),
            object_id=issue.id,
        )

        notify_generic_comment.run(comment.id)

        self.assertTrue(
            Notification.objects.filter(
                recipient=assignee,
                actor=self.recipient,
                object_id=issue.id,
                verb="commented on the Issue",
            ).exists()
        )
