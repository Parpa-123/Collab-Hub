from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from repositories.models import Repository
from activity.models import Activity
from activity.serializers import ActivitySerializer

User = get_user_model()

class ActivitySerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@test.com", password="password")
        self.repo = Repository.objects.create(name="testrepo", owner=self.user)
        self.content_type = ContentType.objects.get_for_model(self.repo)
        self.activity = Activity.objects.create(
            actor=self.user,
            verb="starred repository",
            content_type=self.content_type,
            object_id=self.repo.id,
            repo=self.repo
        )

    def test_activity_serializer_fields(self):
        serializer = ActivitySerializer(self.activity)
        data = serializer.data
        self.assertEqual(data["id"], self.activity.id)
        self.assertEqual(data["actor"], self.user.id)
        self.assertEqual(data["message"], f"{self.user} starred repository {self.repo}")
