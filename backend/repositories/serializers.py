from rest_framework import serializers
from .models import Repository, RepositoryMember
from django.contrib.auth import get_user_model
from config.access.constants import REPO_ADMIN, REPO_MEMBER, REPO_MAINTAINER

class RepositoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Repository
        fields = ["name", "description", "visibility"]

    def validate(self, attrs):
        name = attrs.get("name")
        description = attrs.get("description")
        
        if Repository.objects.filter(name=name, owner=self.context["request"].user).exists():
            raise serializers.ValidationError("Repository with this name already exists")
        if len(description) > 255:
            raise serializers.ValidationError("Description must be less than 255 characters")
        return attrs

class RepositoryListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Repository
        fields = ["name", "description", "visibility", "slug"]

class ViewRepositorySerializer(serializers.ModelSerializer):
    branches = serializers.SerializerMethodField()
    branch_names = serializers.SerializerMethodField()
    class Meta:
        model = Repository
        fields = ["name", "description", "visibility", "default_branch", "branches", "branch_names"]
    
    def get_branches(self, obj: Repository) -> int:
        return obj.branches.count()

    def get_branch_names(self, obj: Repository) -> list[str]:
        return [branch.name for branch in obj.branches.all()]

    def update(self, instance, validated_data):
        name = validated_data.get("name")
        description = validated_data.get("description")
        
        if Repository.objects.filter(name=name, owner=self.context["request"].user).exists():
            raise serializers.ValidationError("Repository with this name already exists")
        if len(description) > 255:
            raise serializers.ValidationError("Description must be less than 255 characters")
        return validated_data

class AddMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepositoryMember
        fields = ["developer", "role"]
    
    def validate(self, attrs):
        developer = attrs.get("developer")
        role = attrs.get("role")
        
        if RepositoryMember.objects.filter(developer=developer, repository=self.context["repository"]).exists():
            raise serializers.ValidationError("Member already exists")
        return attrs

class UpdateMemberRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepositoryMember
        fields = ["role"]

    def validate(self, attrs):
        role = attrs.get("role")
        if role not in [REPO_ADMIN, REPO_MEMBER, REPO_MAINTAINER]:
            raise serializers.ValidationError("Invalid role")
        return attrs

class UserSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["id", "email", "first_name", "last_name"]

class RepositoryMemberSerializer(serializers.Serializer):
    id = serializers.IntegerField(source='developer.id')
    email = serializers.EmailField(source='developer.email')
    first_name = serializers.CharField(source='developer.first_name')
    last_name = serializers.CharField(source='developer.last_name')
    role = serializers.CharField()
