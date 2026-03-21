from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import PullRequest

from notifications.tasks import notify_pr_created
from activity.tasks import log_activity


@receiver(post_save, sender=PullRequest)
def create_pull_request_notification(sender, instance, created, **kwargs):
    if created:
        notify_pr_created.delay(
            instance.id
        )
        log_activity.delay(
            instance.user.id,
            "PullRequest",
            instance.id,
            instance.repo.id,
            "created"
        )
    