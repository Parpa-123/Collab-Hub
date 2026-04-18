from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.db import transaction
from .models import Branches, Commit
from repositories.models import Repository


class BranchesSerializer(serializers.ModelSerializer):
    """Serializer for the Branches model."""

    updated_on = serializers.DateTimeField(source='updated_at', read_only=True)
    source = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Branches
        fields = [
            'id',
            'name',
            'is_protected',
            'is_default',
            'updated_on',
            'source'
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
        source_name = validated_data.pop('source', None)
        
        if source_name:
            source_branch = repository.branches.filter(name=source_name).first()
            if not source_branch:
                raise ValidationError({'source': f'Source branch "{source_name}" does not exist in this repository.'})
        else:
            default_branch_name = repository.default_branch
            source_branch = repository.branches.filter(name=default_branch_name).first()
        
        validated_data['created_by'] = user
        validated_data['created_from'] = source_branch
        validated_data['head_commit'] = source_branch.head_commit if source_branch else None
        validated_data['repository'] = repository
        
        is_default = validated_data.get('is_default', False)
        
        with transaction.atomic():
            branch = Branches.objects.create(**validated_data)
            if is_default:
                repository.branches.exclude(id=branch.id).update(is_default=False)
                repository.default_branch = branch.name
                repository.save(update_fields=['default_branch'])
                
        return branch
        
    def update(self, instance, validated_data):
        is_default = validated_data.get('is_default', instance.is_default)
        validated_data.pop('source', None)
        
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if is_default and instance.is_default:
                repository = instance.repository
                repository.branches.exclude(id=instance.id).update(is_default=False)
                repository.default_branch = instance.name
                repository.save(update_fields=['default_branch'])
                
        return instance


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

