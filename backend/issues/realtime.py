from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

from .serializers import IssueSerializer


def issue_group_name(repo_slug: str) -> str:
    return f"repo.{repo_slug}.issues"


def broadcast_issue_event(*, event_type: str, issue, actor_id: int | None = None, extra_meta: dict | None = None) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    payload = {
        "event_type": event_type,
        "issue": IssueSerializer(issue).data if issue is not None else None,
        "meta": {
            "actor_id": actor_id,
            "repo_slug": issue.repo.slug if issue is not None else None,
            "timestamp": timezone.now().isoformat(),
        },
    }
    if extra_meta:
        payload["meta"].update(extra_meta)

    async_to_sync(channel_layer.group_send)(
        issue_group_name(issue.repo.slug),
        {"type": "issue.event", "payload": payload},
    )
