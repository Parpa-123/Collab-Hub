from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Branches, Commit
from repositories.models import Repository


class BranchesSerializer(serializers.ModelSerializer):
    """Serializer for the Branches model."""

    updated_on = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Branches
        fields = [
            'id',
            'name',
            'is_protected',
            'is_default',
            'updated_on',
        ]
        read_only_fields = ['id', 'updated_on']

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


class CommitSerializer(serializers.ModelSerializer):
    """Serializer for the Commit model."""

    author_email = serializers.EmailField(source='author.email', read_only=True)

    class Meta:
        model = Commit
        fields = [
            'id',
            'repository',
            'branch',
            'parent',
            'second_parent',
            'message',
            'author',
            'author_email',
            'snapshot',
            'created_at',
        ]
        read_only_fields = ['id', 'author', 'repository', 'branch', 'created_at']

