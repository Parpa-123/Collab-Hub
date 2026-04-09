from django.test import TestCase
from unittest.mock import patch, MagicMock
from activity.handlers import handle_pr_created, handle_pr_commented, handle_pr_reviewed, handle_issue_created, handle_issue_assigned
import collections

class FakeUser:
    def __init__(self, id, username="user"):
        self.id = id
        self.username = username
    def get_full_name(self):
        return self.username

class FakeRepo:
    def __init__(self, id):
        self.id = id

class FakePR:
    def __init__(self, id, repo_id):
        self.id = id
        self.repo = FakeRepo(repo_id)

class FakeReview:
    def __init__(self, id, pr):
        self.id = id
        self.pr = pr
    def get_status_display(self):
        return "Approved"

class FakeIssue:
    def __init__(self, id, repo_id):
        self.id = id
        self.repo = FakeRepo(repo_id)

class ActivityHandlersTest(TestCase):
    def setUp(self):
        self.user = FakeUser(1)
        self.repo = FakeRepo(3)
        
    @patch('activity.handlers.ContentType.objects.get_for_model')
    @patch('activity.handlers.log_activity.delay')
    def test_handle_pr_created(self, mock_delay, mock_get_for_model):
        mock_get_for_model.return_value = MagicMock(id=99)
        pr = FakePR(2, 3)
        handle_pr_created({'actor': self.user, 'pr': pr})
        mock_delay.assert_called_once_with(1, 99, 2, 3, 'opened pull request')

    @patch('activity.handlers.ContentType.objects.get_for_model')
    @patch('activity.handlers.log_activity.delay')
    def test_handle_pr_commented(self, mock_delay, mock_get_for_model):
        mock_get_for_model.return_value = MagicMock(id=99)
        pr = FakePR(2, 3)
        review = FakeReview(4, pr)
        handle_pr_commented({'actor': self.user, 'review': review})
        mock_delay.assert_called_once_with(1, 99, 4, 3, 'commented on pull request')

    @patch('activity.handlers.ContentType.objects.get_for_model')
    @patch('activity.handlers.log_activity.delay')
    def test_handle_issue_created(self, mock_delay, mock_get_for_model):
        mock_get_for_model.return_value = MagicMock(id=99)
        issue = FakeIssue(5, 3)
        handle_issue_created({'actor': self.user, 'issue': issue})
        mock_delay.assert_called_once_with(1, 99, 5, 3, 'opened an issue')

    @patch('activity.handlers.ContentType.objects.get_for_model')
    @patch('activity.handlers.log_activity.delay')
    def test_handle_issue_assigned(self, mock_delay, mock_get_for_model):
        mock_get_for_model.return_value = MagicMock(id=99)
        issue = FakeIssue(5, 3)
        assignee = FakeUser(6, "assignee_user")
        handle_issue_assigned({'actor': self.user, 'issue': issue, 'assignee': assignee})
        mock_delay.assert_called_once_with(1, 99, 5, 3, 'assigned assignee_user to issue')
