from django.test import TestCase
from comments.utils import resolve_repository

class FakeObjWithRepo:
    def __init__(self, repo):
        self.repo = repo

class FakeObjWithRepository:
    def __init__(self, repo):
        self.repository = repo

class FakeObjWithoutRepo:
    pass

class UtilsTest(TestCase):
    def test_resolve_repository(self):
        repo1 = "Repo1"
        repo2 = "Repo2"
        self.assertEqual(resolve_repository(FakeObjWithRepo(repo1)), repo1)
        self.assertEqual(resolve_repository(FakeObjWithRepository(repo2)), repo2)
        self.assertIsNone(resolve_repository(FakeObjWithoutRepo()))
