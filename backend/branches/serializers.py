from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Branches
from repositories.models import Repository


class BranchesSerializer(serializers.ModelSerializer):
    """Serializer for the Branches model."""

    class Meta:
        model = Branches
        fields = [
            'id',
            'name',
            'is_protected',
            'is_default',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        """Create and return a new Branches instance."""
        request = self.context.get('request')
        repository_slug = self.context.get('repository')
        
        try:
            repository = Repository.objects.get(slug=repository_slug)
        except Repository.DoesNotExist:
            raise ValidationError({'repository': 'Repository not found.'})
        
        user = request.user
        
        default_branch_name = repository.default_branch
        parent = repository.branches.filter(name=default_branch_name).first()
        
        validated_data['created_by'] = user
        validated_data['created_from'] = parent
        validated_data['repository'] = repository
        return Branches.objects.create(**validated_data)
