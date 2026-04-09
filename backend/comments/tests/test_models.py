from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from repositories.models import Repository
from comments.models import Comment

User = get_user_model()

class CommentModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@test.com", password="password")
        self.repo = Repository.objects.create(name="testrepo", owner=self.user)
        self.content_type = ContentType.objects.get_for_model(self.repo)

    def test_comment_creation(self):
        comment = Comment.objects.create(
            author=self.user,
            content="This is a test comment",
            content_type=self.content_type,
            object_id=self.repo.id,
        )
        self.assertEqual(str(comment), f"Comment by {self.user} on {self.repo}")
        self.assertEqual(comment.content, "This is a test comment")
