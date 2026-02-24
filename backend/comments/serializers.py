from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Comment

User = get_user_model()


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name")


class CommentSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = (
            "id",
            "content_type",
            "object_id",
            "author",
            "content",
            "parent",
            "replies",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("author", "content_type", "object_id")

    def get_replies(self, obj):
        replies = obj.replies.select_related("author").all()
        return CommentSerializer(replies, many=True, context=self.context).data

    