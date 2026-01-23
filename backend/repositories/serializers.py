from rest_framework import serializers
from .models import Repository, RepositoryMember

class RepositoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Repository
        fields = ["name", "description", "visibility"]

    def validate(self, attrs):
        name = attrs.get("name")
        if Repository.objects.filter(name=name, owner=self.context["request"].user).exists():
            raise serializers.ValidationError("Repository with this name already exists")
        return attrs
    


