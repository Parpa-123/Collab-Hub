from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from repositories.models import RepositoryMember

from .realtime import issue_group_name


class RepoIssuesConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.repo_slug = self.scope["url_route"]["kwargs"]["slug"]
        user = await self._resolve_user()
        if user is None:
            await self.close(code=4401)
            return

        has_access = await self._is_repo_member(user.id, self.repo_slug)
        if not has_access:
            await self.close(code=4403)
            return

        self.group_name = issue_group_name(self.repo_slug)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json(
            {
                "type": "issue.subscribed",
                "repo_slug": self.repo_slug,
            }
        )

    async def disconnect(self, code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "issue.ping":
            await self.send_json({"type": "issue.pong"})

    async def issue_event(self, event):
        await self.send_json(event["payload"])

    async def _resolve_user(self):
        scope_user = self.scope.get("user")
        if scope_user and scope_user.is_authenticated:
            return scope_user

        query_string = self.scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]
        if not token:
            return None

        return await self._get_user_from_token(token)

    @database_sync_to_async
    def _get_user_from_token(self, token):
        try:
            access = AccessToken(token)
        except TokenError:
            return None

        user_id = access.get("user_id")
        if not user_id:
            return None

        return get_user_model().objects.filter(id=user_id).first()

    @database_sync_to_async
    def _is_repo_member(self, user_id: int, repo_slug: str) -> bool:
        return RepositoryMember.objects.filter(
            developer_id=user_id,
            repository__slug=repo_slug,
        ).exists()
