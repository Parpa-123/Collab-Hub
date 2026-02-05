from rest_framework import serializers
from .models import Repository, RepositoryMember

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

