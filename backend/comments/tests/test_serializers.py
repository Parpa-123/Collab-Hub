from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from repositories.models import Repository
from comments.models import Comment
from comments.serializers import CommentSerializer

User = get_user_model()

class CommentSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@test.com", password="password")
        self.repo = Repository.objects.create(name="testrepo", owner=self.user)
        self.content_type = ContentType.objects.get_for_model(self.repo)
        self.comment = Comment.objects.create(
            author=self.user,
            content="This is a test comment",
            content_type=self.content_type,
            object_id=self.repo.id,
        )

    def test_comment_serializer(self):
        serializer = CommentSerializer(self.comment)
        data = serializer.data
        self.assertEqual(data["id"], self.comment.id)
        self.assertEqual(data["content"], "This is a test comment")
        self.assertEqual(data["author"]["id"], self.user.id)
        self.assertEqual(data["replies"], [])
