from rest_framework import serializers
from .models import Issue, IssueAssignee, Label
from config.access.constants import REPO_ADMIN, REPO_MAINTAINER, REPO_VIEWER
from accounts.serializers import CustomUserSerializer
from django.contrib.auth import get_user_model

class IssueUserSerializer(serializers.ModelSerializer):
    pk = serializers.IntegerField(source='id', read_only=True)
    class Meta:
        model = get_user_model()
        fields = ['id', 'pk', 'email', 'first_name', 'last_name']




class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = '__all__'


class IssueAssigneeSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueAssignee
        fields = '__all__'
        

    def validate(self, attrs):
        if IssueAssignee.objects.filter(issue=attrs["issue"], assignee=attrs["assignee"]).exists():
            raise serializers.ValidationError("Assignee already exists")
        return attrs

class IssueSerializer(serializers.ModelSerializer):
    labels = LabelSerializer(many=True, read_only=True)
    assignees = IssueAssigneeSerializer(many=True, read_only=True)
    creator = IssueUserSerializer(read_only=True)

    label_ids = serializers.PrimaryKeyRelatedField(
        queryset=Label.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source="labels"
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        view = self.context.get('view')
        
        if view and hasattr(view, 'kwargs') and 'slug' in view.kwargs:
            slug = view.kwargs.get('slug')
            self.fields['label_ids'].queryset = Label.objects.filter(repo__slug=slug)

    class Meta:
        model = Issue
        fields = '__all__'
        read_only_fields = ["id", "repo", "created_at", "creator", "updated_at"]

    def validate(self, attrs):
        parent = attrs.get("parent")
        repo = attrs.get("repo")

        if parent and parent.repo != repo:
            raise serializers.ValidationError(
                "Parent issue must belong to the same repository."
            )
        return attrs
