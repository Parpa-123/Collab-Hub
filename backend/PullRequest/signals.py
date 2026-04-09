from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import PullRequest

from branches.models import Branches
from config.events.dispatcher import dispatch_event
from config.events.event_types import BRANCH_UPDATED

@receiver(post_save, sender=Branches)
def trigger_diff_on_branch_update(sender, instance, created, **kwargs):
    """
    Whenever a branch is updated (e.g., new commit is pushed, or a force push rewrites the head),
    dispatch an event. The dedicated handlers will take care of regenerating dependent PullRequests.
    """
    dispatch_event(
        BRANCH_UPDATED,
        {
            "branch": instance
        }
    )