from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from repositories.models import Repository, RepositoryMember


User = get_user_model()


class RepositoryUserSearchViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="pass123",
            first_name="Owner",
            last_name="User",
        )
        self.repo = Repository.objects.create(
            name="Searchable Repo",
            owner=self.owner,
            description="Test repo",
            visibility=Repository.Visibility.PRIVATE,
        )
        RepositoryMember.objects.create(
            developer=self.owner,
            repository=self.repo,
            role=RepositoryMember.Role.REPO_ADMIN,
        )

    def search_users(self, query):
        self.client.force_authenticate(user=self.owner)
        return self.client.get(
            f"/api/repositories/{self.repo.slug}/search-users/",
            {"search": query},
        )

    def test_search_users_matches_partial_name_terms(self):
        target = User.objects.create_user(
            email="alex.river@example.com",
            password="pass123",
            first_name="Alexandra",
            last_name="Rivera",
        )
        User.objects.create_user(
            email="someone@example.com",
            password="pass123",
            first_name="Sam",
            last_name="Stone",
        )

        response = self.search_users("lex riv")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([user["id"] for user in response.data], [target.id])

    def test_search_users_matches_partial_email(self):
        target = User.objects.create_user(
            email="dev.partner@example.com",
            password="pass123",
            first_name="Dev",
            last_name="Partner",
        )

        response = self.search_users("partner@")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([user["id"] for user in response.data], [target.id])

    def test_search_users_excludes_existing_members(self):
        member = User.objects.create_user(
            email="member@example.com",
            password="pass123",
            first_name="Member",
            last_name="Person",
        )
        RepositoryMember.objects.create(
            developer=member,
            repository=self.repo,
            role=RepositoryMember.Role.MEMBER,
        )

        response = self.search_users("member")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
