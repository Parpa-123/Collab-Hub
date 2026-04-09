from django.test import TestCase
from django.contrib.auth import get_user_model
from repositories.models import Repository
from django.contrib.contenttypes.models import ContentType
from activity.models import Activity
from activity.tasks import log_activity

User = get_user_model()

class ActivityTasksTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@test.com", password="password")
        self.repo = Repository.objects.create(name="testrepo", owner=self.user)
        self.content_type = ContentType.objects.get_for_model(self.repo)

    def test_log_activity_task(self):
        # Execute the task directly synchronously for the test
        log_activity(self.user.id, self.content_type.id, self.repo.id, self.repo.id, "created repository")
        
        self.assertEqual(Activity.objects.count(), 1)
        activity = Activity.objects.first()
        self.assertEqual(activity.verb, "created repository")
        self.assertEqual(activity.actor, self.user)
        self.assertEqual(activity.repo, self.repo)
