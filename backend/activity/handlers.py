from config.events.decorators import event_handler
from config.events.event_types import PR_CREATED, PR_COMMENTED, PR_REVIEWED, ISSUE_CREATED, ISSUE_ASSIGNED
from django.contrib.contenttypes.models import ContentType
from .models import Activity
from .tasks import log_activity

@event_handler(PR_CREATED)
def handle_pr_created(data):
    try:
        actor = data['actor']
        pr = data['pr']
        content_type_id = ContentType.objects.get_for_model(pr).id
        log_activity.delay(actor.id, content_type_id, pr.id, pr.repo.id, 'opened pull request')
    except Exception as e:
        print(f"Error handling activity PR_CREATED: {e}")

@event_handler(PR_COMMENTED)
def handle_pr_commented(data):
    try:
        actor = data['actor']
        review = data['review']
        content_type_id = ContentType.objects.get_for_model(review).id
        log_activity.delay(actor.id, content_type_id, review.id, review.pr.repo.id, 'commented on pull request')
    except Exception as e:
        print(f"Error handling activity PR_COMMENTED: {e}")

@event_handler(PR_REVIEWED)
def handle_pr_reviewed(data):
    try:
        actor = data['actor']
        review = data['review']
        content_type_id = ContentType.objects.get_for_model(review).id
        verb = f"{review.get_status_display().lower()} pull request"
        log_activity.delay(actor.id, content_type_id, review.id, review.pr.repo.id, verb)
    except Exception as e:
        print(f"Error handling activity PR_REVIEWED: {e}")

@event_handler(ISSUE_CREATED)
def handle_issue_created(data):
    try:
        actor = data['actor']
        issue = data['issue']
        content_type_id = ContentType.objects.get_for_model(issue).id
        log_activity.delay(actor.id, content_type_id, issue.id, issue.repo.id, 'opened an issue')
    except Exception as e:
        print(f"Error handling activity ISSUE_CREATED: {e}")

@event_handler(ISSUE_ASSIGNED)
def handle_issue_assigned(data):
    try:
        actor = data['actor']
        issue = data['issue']
        assignee = data['assignee']
        content_type_id = ContentType.objects.get_for_model(issue).id
        verb = f"assigned {assignee.get_full_name() or assignee.username} to issue"
        log_activity.delay(actor.id, content_type_id, issue.id, issue.repo.id, verb)
    except Exception as e:
        print(f"Error handling activity ISSUE_ASSIGNED: {e}")

