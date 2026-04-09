from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from repositories.models import Repository
from activity.models import Activity

User = get_user_model()

class ActivityModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@test.com", password="password")
        self.repo = Repository.objects.create(name="testrepo", owner=self.user)
        self.content_type = ContentType.objects.get_for_model(self.repo)

    def test_activity_creation_and_str(self):
        activity = Activity.objects.create(
            actor=self.user,
            verb="created repository",
            content_type=self.content_type,
            object_id=self.repo.id,
            repo=self.repo
        )
        self.assertEqual(str(activity), f"{self.user} created repository {self.repo}")
        self.assertEqual(activity.verb, "created repository")
