from config.events.decorators import event_handler
from config.events.event_types import PR_CREATED, PR_REOPENED, BRANCH_UPDATED
from .tasks import trigger_diff_generation
from .models import PullRequest
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)

@event_handler(PR_CREATED)
def handle_pr_created(data):
    """Trigger diff generation when a PR is initially created."""
    pr = data.get("pr")
    if pr:
        trigger_diff_generation(pr.id)

@event_handler(PR_REOPENED)
def handle_pr_reopened(data):
    """Trigger diff generation when a PR is reopened."""
    pr = data.get("pr")
    if pr:
        trigger_diff_generation(pr.id)

@event_handler(BRANCH_UPDATED)
def handle_branch_updated(data):
    """
    Find all OPEN pull requests affected by a branch update (new commit, force push),
    and smartly trigger a diff regeneration natively.
    """
    branch = data.get("branch")
    if not branch:
        return

    # Optimization: One single query that only fetches integer IDs of open PRs 
    # instead of pulling entire PR model objects across two separate queries.
    impacted_pr_ids = PullRequest.objects.filter(
        Q(source_branch=branch) | Q(target_branch=branch),
        status="OPEN"
    ).values_list('id', flat=True)

    for pr_id in impacted_pr_ids:
        trigger_diff_generation(pr_id)
