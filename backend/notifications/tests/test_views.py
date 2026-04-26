from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.urls import reverse
from repositories.models import Repository
from notifications.models import Notification

User = get_user_model()

class NotificationViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="testuser@test.com", password="password")
        self.actor = User.objects.create_user(email="actor@test.com", password="password")
        self.repo = Repository.objects.create(name="testrepo", description="test repository", owner=self.actor)
        self.content_type = ContentType.objects.get_for_model(self.repo)
        
        self.notification = Notification.objects.create(
            recipient=self.user,
            actor=self.actor,
            content_type=self.content_type,
            object_id=self.repo.id,
            verb="pinged you"
        )
        self.list_url = reverse("notification-list")

    def test_list_notifications(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        if isinstance(data, dict) and 'results' in data:
            data = data['results']
        self.assertEqual(len(data), 1)

    def test_mark_read_action(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("notification-mark-read", kwargs={"pk": self.notification.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)
        self.assertIsNotNone(self.notification.read_at)

    def test_mark_all_read_action(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("notification-mark-all-read")
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)
        self.assertLessEqual(abs((timezone.now() - self.notification.read_at).total_seconds()), 5)

    def test_unread_count(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("notification-unread-count")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
