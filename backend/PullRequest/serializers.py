from rest_framework import serializers
from .models import PullRequest, Review

class PullRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PullRequest
        fields = '__all__'
        read_only_fields = ('created_by', 'merged_by', 'merged_at', 'closed_at', 'base_commit', 'repo', 'status')

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
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, attrs):
        pr = attrs.get('pr')
        reviewer = attrs.get('reviewer') or self.context['request'].user

        if pr.status != "OPEN":
            raise serializers.ValidationError("Pull request must be open to review.")
        
        if reviewer == pr.created_by:
            raise serializers.ValidationError("You cannot review your own pull request.")
            
        if not pr.repo.repositoryMembers.filter(developer=reviewer).exists():
            raise serializers.ValidationError("You are not a member of this repository.")
            
        if attrs.get('status') not in ["APPROVED", "CHANGES_REQUESTED", "COMMENTED"]:
            raise serializers.ValidationError("Invalid status.")
            
        if pr.source_branch_deleted or pr.target_branch_deleted:
            raise serializers.ValidationError("Pull request must have both source and target branches.")
        return attrs