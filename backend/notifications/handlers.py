from .tasks import notify_pr_created, notify_pr_commented, notify_pr_reviewed, notify_issue_created, notify_issue_assigned
from config.events.decorators import event_handler
from config.events.event_types import PR_CREATED, PR_COMMENTED, PR_REVIEWED, ISSUE_CREATED, ISSUE_ASSIGNED

@event_handler(PR_CREATED)
def handle_pr_created(payload):
    """Handle PR created event"""
    try:
        notify_pr_created.delay(payload['pr'].id)
    except Exception as e:
        print(f"Error handling PR created event: {e}")

@event_handler(PR_COMMENTED)
def handle_pr_commented(payload):
    try:
        notify_pr_commented.delay(payload['review'].id)
    except Exception as e:
        print(f"Error handling PR commented event: {e}")

@event_handler(PR_REVIEWED)
def handle_pr_reviewed(payload):
    try:
        notify_pr_reviewed.delay(payload['review'].id)
    except Exception as e:
        print(f"Error handling PR reviewed event: {e}")

@event_handler(ISSUE_CREATED)
def handle_issue_created(payload):
    try:
        notify_issue_created.delay(payload['issue'].id)
    except Exception as e:
        print(f"Error handling issue created event: {e}")

@event_handler(ISSUE_ASSIGNED)
def handle_issue_assigned(payload):
    try:
        notify_issue_assigned.delay(
            issue_id=payload['issue'].id,
            assignee_id=payload['assignee'].id,
            actor_id=payload['actor'].id
        )
    except Exception as e:
        print(f"Error handling issue assigned event: {e}")