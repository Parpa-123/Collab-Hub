import logging
from .tasks import notify_pr_created, notify_pr_commented, notify_pr_reviewed, notify_issue_created, notify_issue_assigned, notify_pr_reopened, notify_pr_merged, notify_pr_closed, notify_issue_closed, notify_repo_member_added
from config.events.decorators import event_handler
from config.events.event_types import COMMENT_CREATED, PR_CREATED, PR_COMMENTED, PR_REVIEWED, ISSUE_CREATED, ISSUE_ASSIGNED, PR_REOPENED, PR_MERGED, PR_CLOSED, ISSUE_CLOSED, REPO_MEMBER_ADDED
from .tasks import notify_generic_comment

logger = logging.getLogger(__name__)


def enqueue_notification_task(task, *args, **kwargs):
    try:
        task.delay(*args, **kwargs)
    except Exception:
        logger.exception("Failed to enqueue %s; running it synchronously.", task.name)
        try:
            task.apply(args=args, kwargs=kwargs)
        except Exception:
            logger.exception("Synchronous fallback failed for %s.", task.name)

@event_handler(PR_CREATED)
def handle_pr_created(payload):
    """Handle PR created event"""
    enqueue_notification_task(notify_pr_created, payload['pr'].id)

@event_handler(PR_REOPENED)
def handle_pr_reopened(payload):
    enqueue_notification_task(notify_pr_reopened, payload['pr'].id)

@event_handler(PR_COMMENTED)
def handle_pr_commented(payload):
    enqueue_notification_task(notify_pr_commented, payload['review'].id)

@event_handler(PR_REVIEWED)
def handle_pr_reviewed(payload):
    enqueue_notification_task(notify_pr_reviewed, payload['review'].id)

@event_handler(ISSUE_CREATED)
def handle_issue_created(payload):
    enqueue_notification_task(notify_issue_created, payload['issue'].id)

@event_handler(ISSUE_ASSIGNED)
def handle_issue_assigned(payload):
    enqueue_notification_task(
        notify_issue_assigned,
        issue_id=payload['issue'].id,
        assignee_id=payload['assignee'].id,
        actor_id=payload['actor'].id,
        issue_assignee_id=payload.get('issue_assignee_id'),
    )

@event_handler(COMMENT_CREATED)
def handle_comment_created(payload):
    enqueue_notification_task(notify_generic_comment, payload['comment'].id)

@event_handler(PR_MERGED)
def handle_pr_merged(payload):
    enqueue_notification_task(notify_pr_merged, payload['pr'].id, payload['actor'].id)

@event_handler(PR_CLOSED)
def handle_pr_closed(payload):
    enqueue_notification_task(notify_pr_closed, payload['pr'].id, payload['actor'].id)

@event_handler(ISSUE_CLOSED)
def handle_issue_closed(payload):
    enqueue_notification_task(notify_issue_closed, payload['issue'].id, payload['actor'].id)

@event_handler(REPO_MEMBER_ADDED)
def handle_repo_member_added(payload):
    enqueue_notification_task(notify_repo_member_added, payload['repo'].id, payload['member'].id, payload['actor'].id)
