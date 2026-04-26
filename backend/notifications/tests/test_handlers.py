from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import TestCase

from notifications.handlers import (
    enqueue_notification_task,
    handle_issue_assigned,
    handle_pr_reopened,
)
from notifications.tasks import notify_issue_assigned, notify_pr_reopened


class NotificationHandlersTest(TestCase):
    def test_enqueue_notification_task_falls_back_to_sync_apply(self):
        task = Mock()
        task.name = "fake.task"
        task.delay.side_effect = RuntimeError("broker unavailable")

        enqueue_notification_task(task, 1, two=2)

        task.apply.assert_called_once_with(args=(1,), kwargs={"two": 2})

    def test_handle_issue_assigned_forwards_issue_assignee_id(self):
        payload = {
            "issue": SimpleNamespace(id=101),
            "assignee": SimpleNamespace(id=202),
            "actor": SimpleNamespace(id=303),
            "issue_assignee_id": 404,
        }

        with patch("notifications.handlers.enqueue_notification_task") as mock_enqueue:
            handle_issue_assigned(payload)

        mock_enqueue.assert_called_once_with(
            notify_issue_assigned,
            issue_id=101,
            assignee_id=202,
            actor_id=303,
            issue_assignee_id=404,
        )

    def test_handle_pr_reopened_enqueues_reopen_task(self):
        payload = {"pr": SimpleNamespace(id=42)}

        with patch("notifications.handlers.enqueue_notification_task") as mock_enqueue:
            handle_pr_reopened(payload)

        mock_enqueue.assert_called_once_with(notify_pr_reopened, 42)
