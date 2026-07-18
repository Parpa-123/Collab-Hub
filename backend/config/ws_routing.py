from django.urls import re_path

from common.consumers import HealthConsumer
from issues.consumers import RepoIssuesConsumer
from notifications.consumers import NotificationConsumer

websocket_urlpatterns = [
    re_path(r"^ws/health/$", HealthConsumer.as_asgi()),
    re_path(r"^ws/notifications/$", NotificationConsumer.as_asgi()),
    re_path(r"^ws/repositories/(?P<slug>[-a-zA-Z0-9_]+)/issues/$", RepoIssuesConsumer.as_asgi()),
]
