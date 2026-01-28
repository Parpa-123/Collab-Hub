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

    
class ViewRepositorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Repository
        fields = ["name", "description", "visibility", "default_branch", "created_at", "updated_at"]

    def update(self, instance, validated_data):
        name = validated_data.get("name")
        description = validated_data.get("description")
        
        if Repository.objects.filter(name=name, owner=self.context["request"].user).exists():
            raise serializers.ValidationError("Repository with this name already exists")
        if len(description) > 255:
            raise serializers.ValidationError("Description must be less than 255 characters")
        return validated_data

