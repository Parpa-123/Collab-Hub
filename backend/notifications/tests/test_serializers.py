from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from repositories.models import Repository
from notifications.models import Notification
from notifications.serializers import NotificationSerializer

User = get_user_model()

class NotificationSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@test.com", password="password")
        self.actor_user = User.objects.create_user(
            email="actor@test.com",
            first_name="John",
            last_name="Doe",
            password="password",
        )
        self.repo = Repository.objects.create(name="testrepo", description="test repository", owner=self.actor_user)
        self.content_type = ContentType.objects.get_for_model(self.repo)
        
        self.notification = Notification.objects.create(
            recipient=self.user,
            actor=self.actor_user,
            content_type=self.content_type,
            object_id=self.repo.id,
            verb="pinged you"
        )

    def test_notification_serialization(self):
        serializer = NotificationSerializer(self.notification)
        data = serializer.data
        
        self.assertEqual(data["id"], self.notification.id)
        self.assertEqual(data["actor_name"], "John Doe")
        self.assertEqual(data["verb"], "pinged you")
        self.assertFalse(data["is_read"])
        
        # Test generic foreign key resolution
        content_object = data["content_object"]
        self.assertIsNotNone(content_object)
        self.assertEqual(content_object["type"], "Repository")
        self.assertEqual(content_object["name"], str(self.repo))
