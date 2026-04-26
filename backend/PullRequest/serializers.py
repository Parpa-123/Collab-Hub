from rest_framework import serializers
from .models import PullRequest, Review

class PullRequestSerializer(serializers.ModelSerializer):
    has_conflicts = serializers.ReadOnlyField()
    is_mergeable = serializers.ReadOnlyField()
    created_by_detail = serializers.SerializerMethodField()
    merged_by_detail = serializers.SerializerMethodField()

    class Meta:
        model = PullRequest
        fields = '__all__'
        read_only_fields = ('created_by', 'merged_by', 'merged_at', 'closed_at', 'base_commit', 'repo', 'status')

    def get_user_detail(self, user):
        if not user:
            return None
        return {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.get_full_name().strip() or user.email,
        }

    def get_created_by_detail(self, obj):
        return self.get_user_detail(obj.created_by)

    def get_merged_by_detail(self, obj):
        return self.get_user_detail(obj.merged_by)

    def validate(self, attrs):
        source = attrs.get('source_branch')
        target = attrs.get('target_branch')
        if source and target:
            if source == target:
                raise serializers.ValidationError("Source and target branches cannot be the same.")
            if source.repository != target.repository:
                raise serializers.ValidationError("Source and target branches must belong to the same repository.")
        return attrs

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ('id', 'reviewer', 'pr', 'created_at', 'updated_at')

    def validate(self, attrs):
        if attrs.get('status') not in ["APPROVED", "CHANGES_REQUESTED", "COMMENTED"]:
            raise serializers.ValidationError("Invalid status.")
        return attrs
