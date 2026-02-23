from rest_framework import serializers
from .models import PullRequest, Review, PullRequestComment

class PullRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PullRequest
        fields = '__all__'
        read_only_fields = ('created_by', 'merged_by', 'merged_at', 'closed_at')

    def validate(self, attrs):
        if attrs['source_branch'] == attrs['target_branch']:
            raise serializers.ValidationError("Source and target branches cannot be the same.")
        if attrs['source_branch'].repo != attrs['target_branch'].repo:
            raise serializers.ValidationError("Source and target branches must belong to the same repository.")
        return attrs

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, attrs):
        if attrs['reviewer'] == attrs['pr'].created_by:
            raise serializers.ValidationError("You cannot review your own pull request.")
        if not attrs['pr'].repo.repositoryMembers.filter(developer=attrs['reviewer']).exists():
            raise serializers.ValidationError("You are not a member of this repository.")
        if attrs['status'] not in ["APPROVED", "CHANGES_REQUESTED", "COMMENTED"]:
            raise serializers.ValidationError("Invalid status.")
        if attrs['pr'].status != "OPEN":
            raise serializers.ValidationError("Pull request must be open to review.")
        if attrs['pr'].source_branch_deleted or attrs['pr'].target_branch_deleted:
            raise serializers.ValidationError("Pull request must have both source and target branches.")
        return attrs     

class PullRequestCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PullRequestComment
        fields = '__all__'