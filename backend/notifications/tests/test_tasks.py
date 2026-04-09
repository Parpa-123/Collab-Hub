from django.test import TestCase
from unittest.mock import patch, MagicMock
from notifications.tasks import notify_pr_created
import collections

class FakeUser:
    def __init__(self, id, full_name="user"):
        self.id = id
        self.full_name = full_name
    def get_full_name(self):
        return self.full_name

class FakeMember:
    def __init__(self, user):
        self.developer = user

class FakeRepo:
    def __init__(self, id):
        self.id = id

class FakePR:
    def __init__(self, id, repo, user):
        self.id = id
        self.repo = repo
        self.created_by = user

class NotificationTasksTest(TestCase):
    @patch('notifications.tasks.PullRequest.objects.select_related')
    @patch('notifications.tasks.RepositoryMember.objects.select_related')
    @patch('notifications.tasks.ContentType.objects.get_for_model')
    @patch('notifications.tasks.Notification.objects.bulk_create')
    def test_notify_pr_created(self, mock_bulk, mock_ct, mock_repo_member, mock_pr):
        user = FakeUser(1)
        repo = FakeRepo(2)
        pr = FakePR(3, repo, user)
        other_user = FakeUser(4)
        
        mock_pr.return_value.get.return_value = pr
        mock_repo_member.return_value.filter.return_value.exclude.return_value = [FakeMember(other_user)]
        mock_ct.return_value = MagicMock(id=99)
        
        notify_pr_created(3)
        
        self.assertTrue(mock_bulk.called)
        args, kwargs = mock_bulk.call_args
        notifications_list = args[0]
        self.assertEqual(len(notifications_list), 1)
        self.assertEqual(notifications_list[0].verb, "created a pull request")
        self.assertEqual(notifications_list[0].recipient, other_user)
