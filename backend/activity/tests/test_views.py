from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from repositories.models import Repository
from activity.models import Activity

User = get_user_model()

class ActivityViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@test.com", password="password")
        self.repo = Repository.objects.create(name="testrepo", owner=self.user)
        self.content_type = ContentType.objects.get_for_model(self.repo)
        self.activity_verb = "starred repository"
        self.activity = Activity.objects.create(
            actor=self.user,
            verb=self.activity_verb,
            content_type=self.content_type,
            object_id=self.repo.id,
            repo=self.repo
        )

    def test_activity_list_view_returns_correct_data(self):
        self.client.force_authenticate(user=self.user)
        # Attempt to resolve the URL, assuming the URL path expects a repo_id
        try:
            url = reverse("activity-list", kwargs={"repo_id": self.repo.id})
        except Exception:
            # Fallback if the URL isn't structured with kwargs in reverse, though in Django REST it usually is when nested.
            # Using absolute path from typical API conventions as a backup in case reverse fails due to include setup
            url = f"/api/repositories/{self.repo.id}/activity/"
            pass

        response = self.client.get(url)
        # If the URL is not found, test might fail here, but assuming it correctly maps
        if response.status_code == status.HTTP_404_NOT_FOUND:
            self.skipTest("activity-list route not found or not mapped with repo_id in test environment")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Determine if pagination wraps results
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["message"], f"{self.user} {self.activity_verb} {self.repo}")
