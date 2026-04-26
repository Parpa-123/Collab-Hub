from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from repositories.models import Repository
from notifications.models import Notification

User = get_user_model()

class NotificationModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@test.com", password="password")
        self.actor = User.objects.create_user(email="actor@test.com", password="password")
        self.repo = Repository.objects.create(name="testrepo", description="test repository", owner=self.actor)
        self.content_type = ContentType.objects.get_for_model(self.repo)

    def test_notification_creation_and_defaults(self):
        notification = Notification.objects.create(
            recipient=self.user,
            actor=self.actor,
            content_type=self.content_type,
            object_id=self.repo.id,
            verb="created a new repository",
        )
        self.assertEqual(str(notification), f"{self.actor} created a new repository {self.repo}")
        self.assertFalse(notification.is_read)
        self.assertIsNone(notification.read_at)

    def test_dedupe_key_is_unique(self):
        Notification.objects.create(
            recipient=self.user,
            actor=self.actor,
            content_type=self.content_type,
            object_id=self.repo.id,
            verb="created a new repository",
            dedupe_key="dedupe-key-1",
        )

        with self.assertRaises(IntegrityError):
            Notification.objects.create(
                recipient=self.user,
                actor=self.actor,
                content_type=self.content_type,
                object_id=self.repo.id,
                verb="created a new repository",
                dedupe_key="dedupe-key-1",
            )
