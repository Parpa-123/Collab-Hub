from django.test import TestCase, Client
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from repositories.models import Repository, RepositoryMember
from issues.models import Issue, Label, IssueAssignee, IssueChoices
from branches.models import Branches
from PullRequest.models import PullRequest, Review, PullRequestComment

User = get_user_model()


class UserModelTest(TestCase):
    """Tests for the CustomUser model creation."""

    def setUp(self):
        self.client = Client()
        self.api_client = APIClient()
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

    def test_user_creation(self):
        """Test that a user can be created successfully."""
        self.assertEqual(self.user.email, "testuser@example.com")
        self.assertEqual(self.user.first_name, "Test")
        self.assertEqual(self.user.last_name, "User")
        self.assertTrue(self.user.is_active)
        self.assertFalse(self.user.is_staff)

    def test_user_str(self):
        """Test the string representation of a user."""
        self.assertEqual(str(self.user), "testuser@example.com")

    def test_user_full_name(self):
        """Test get_full_name returns first + last name."""
        self.assertEqual(self.user.get_full_name(), "Test User")

    def test_user_short_name(self):
        """Test get_short_name returns first name."""
        self.assertEqual(self.user.get_short_name(), "Test")

    def test_superuser_creation(self):
        """Test that a superuser can be created successfully."""
        admin = User.objects.create_superuser(
            email="admin@example.com",
            password="adminpass123",
            first_name="Admin",
            last_name="User",
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_user_creation_without_email_raises(self):
        """Test that creating a user without an email raises ValueError."""
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="testpass123")


class RepositoryModelTest(TestCase):
    """Tests for the Repository model creation."""

    def setUp(self):
        self.client = Client()
        self.api_client = APIClient()
        self.user = User.objects.create_user(
            email="repoowner@example.com",
            password="testpass123",
            first_name="Repo",
            last_name="Owner",
        )
        self.repo = Repository.objects.create(
            name="Test Repository",
            owner=self.user,
            description="A test repository",
            visibility=Repository.Visibility.PUBLIC,
        )

    def test_repository_creation(self):
        """Test that a repository can be created successfully."""
        self.assertEqual(self.repo.name, "Test Repository")
        self.assertEqual(self.repo.owner, self.user)
        self.assertEqual(self.repo.description, "A test repository")
        self.assertEqual(self.repo.visibility, "public")
        self.assertEqual(self.repo.default_branch, "main")

    def test_repository_str(self):
        """Test the string representation of a repository."""
        self.assertEqual(str(self.repo), "Test Repository - public")

    def test_repository_slug_auto_generated(self):
        """Test that a slug is auto-generated on save."""
        self.assertEqual(self.repo.slug, "test-repository")

    def test_repository_timestamps(self):
        """Test that created_at and updated_at are auto-set."""
        self.assertIsNotNone(self.repo.created_at)
        self.assertIsNotNone(self.repo.updated_at)


class RepositoryMemberModelTest(TestCase):
    """Tests for the RepositoryMember model creation."""

    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com", password="pass123",
            first_name="Owner", last_name="User",
        )
        self.member_user = User.objects.create_user(
            email="member@example.com", password="pass123",
            first_name="Member", last_name="User",
        )
        self.repo = Repository.objects.create(
            name="Collab Repo", owner=self.owner,
            description="A collaborative repo",
        )
        self.member = RepositoryMember.objects.create(
            developer=self.member_user,
            repository=self.repo,
            role=RepositoryMember.Role.MAINTAINER,
        )

    def test_repository_member_creation(self):
        """Test that a repository member can be created."""
        self.assertEqual(self.member.developer, self.member_user)
        self.assertEqual(self.member.repository, self.repo)
        self.assertEqual(self.member.role, "maintainer")

    def test_repository_member_str(self):
        """Test the string representation of a repository member."""
        expected = f"{self.member_user} - {self.repo} - maintainer"
        self.assertEqual(str(self.member), expected)

    def test_repository_member_default_role(self):
        """Test that the default role is 'member'."""
        new_member = RepositoryMember.objects.create(
            developer=self.owner, repository=self.repo,
        )
        self.assertEqual(new_member.role, "member")


class LabelModelTest(TestCase):
    """Tests for the Label model creation."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="label@example.com", password="pass123",
            first_name="Label", last_name="User",
        )
        self.repo = Repository.objects.create(
            name="Label Repo", owner=self.user,
            description="Repo with labels",
        )
        self.label = Label.objects.create(
            name="bug", color="#ff0000",
            description="Something is broken",
            repo=self.repo,
        )

    def test_label_creation(self):
        """Test that a label can be created."""
        self.assertEqual(self.label.name, "bug")
        self.assertEqual(self.label.color, "#ff0000")
        self.assertEqual(self.label.repo, self.repo)

    def test_label_str(self):
        """Test the string representation of a label."""
        self.assertEqual(str(self.label), "bug")


class IssueModelTest(TestCase):
    """Tests for the Issue model creation."""

    def setUp(self):
        self.client = Client()
        self.api_client = APIClient()
        self.user = User.objects.create_user(
            email="issues@example.com", password="pass123",
            first_name="Issue", last_name="Creator",
        )
        self.repo = Repository.objects.create(
            name="Issue Repo", owner=self.user,
            description="Repo with issues",
        )
        self.issue = Issue.objects.create(
            repo=self.repo,
            title="Test Issue",
            description="This is a test issue",
            status=IssueChoices.OPEN,
            creator=self.user,
        )

    def test_issue_creation(self):
        """Test that an issue can be created."""
        self.assertEqual(self.issue.title, "Test Issue")
        self.assertEqual(self.issue.description, "This is a test issue")
        self.assertEqual(self.issue.status, "open")
        self.assertEqual(self.issue.creator, self.user)
        self.assertEqual(self.issue.repo, self.repo)

    def test_issue_str(self):
        """Test the string representation of an issue."""
        self.assertEqual(str(self.issue), "Test Issue")

    def test_issue_with_label(self):
        """Test that a label can be added to an issue."""
        label = Label.objects.create(
            name="enhancement", color="#00ff00",
            description="New feature", repo=self.repo,
        )
        self.issue.labels.add(label)
        self.assertIn(label, self.issue.labels.all())

    def test_issue_with_parent(self):
        """Test that a sub-issue can reference a parent issue."""
        child = Issue.objects.create(
            repo=self.repo,
            title="Child Issue",
            description="Sub-task",
            status=IssueChoices.OPEN,
            creator=self.user,
            parent=self.issue,
        )
        self.assertEqual(child.parent, self.issue)
        self.assertIn(child, self.issue.children.all())


class IssueAssigneeModelTest(TestCase):
    """Tests for the IssueAssignee model creation."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="assignee@example.com", password="pass123",
            first_name="Assignee", last_name="User",
        )
        self.repo = Repository.objects.create(
            name="Assignee Repo", owner=self.user,
            description="Repo for assignee tests",
        )
        self.issue = Issue.objects.create(
            repo=self.repo, title="Assign Me",
            description="Issue to assign",
            status=IssueChoices.OPEN, creator=self.user,
        )
        self.assignment = IssueAssignee.objects.create(
            issue=self.issue, assignee=self.user,
        )

    def test_issue_assignee_creation(self):
        """Test that an issue assignee can be created."""
        self.assertEqual(self.assignment.issue, self.issue)
        self.assertEqual(self.assignment.assignee, self.user)
        self.assertIsNotNone(self.assignment.assigned_at)

    def test_issue_assignee_str(self):
        """Test the string representation of an issue assignee."""
        expected = f"{self.issue} - {self.user}"
        self.assertEqual(str(self.assignment), expected)


class BranchModelTest(TestCase):
    """Tests for the Branches model creation."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="branch@example.com", password="pass123",
            first_name="Branch", last_name="User",
        )
        self.repo = Repository.objects.create(
            name="Branch Repo", owner=self.user,
            description="Repo with branches",
        )
        self.branch = Branches.objects.create(
            name="main", repository=self.repo,
            is_default=True, created_by=self.user,
        )

    def test_branch_creation(self):
        """Test that a branch can be created."""
        self.assertEqual(self.branch.name, "main")
        self.assertEqual(self.branch.repository, self.repo)
        self.assertTrue(self.branch.is_default)
        self.assertFalse(self.branch.is_protected)

    def test_branch_str(self):
        """Test the string representation of a branch."""
        self.assertEqual(str(self.branch), "main - Branch Repo")

    def test_branch_created_from(self):
        """Test that a branch can be created from another branch."""
        feature = Branches.objects.create(
            name="feature-x", repository=self.repo,
            created_by=self.user, created_from=self.branch,
        )
        self.assertEqual(feature.created_from, self.branch)


class PullRequestModelTest(TestCase):
    """Tests for the PullRequest model creation."""

    def setUp(self):
        self.client = Client()
        self.api_client = APIClient()
        self.user = User.objects.create_user(
            email="pr@example.com", password="pass123",
            first_name="PR", last_name="User",
        )
        self.repo = Repository.objects.create(
            name="PR Repo", owner=self.user,
            description="Repo for PR tests",
        )
        self.source = Branches.objects.create(
            name="feature", repository=self.repo,
            created_by=self.user,
        )
        self.target = Branches.objects.create(
            name="main", repository=self.repo,
            is_default=True, created_by=self.user,
        )
        self.pr = PullRequest.objects.create(
            repo=self.repo,
            source_branch=self.source,
            target_branch=self.target,
            title="Add feature",
            description="Implements a new feature",
            status="OPEN",
            created_by=self.user,
        )

    def test_pull_request_creation(self):
        """Test that a pull request can be created."""
        self.assertEqual(self.pr.title, "Add feature")
        self.assertEqual(self.pr.status, "OPEN")
        self.assertEqual(self.pr.source_branch, self.source)
        self.assertEqual(self.pr.target_branch, self.target)
        self.assertEqual(self.pr.created_by, self.user)

    def test_pull_request_str(self):
        """Test the string representation of a pull request."""
        self.assertEqual(str(self.pr), f"PR #{self.pr.id}: Add feature")

    def test_pull_request_saves_branch_names(self):
        """Test that source_name and target_name are auto-populated on save."""
        self.assertEqual(self.pr.source_name, "feature")
        self.assertEqual(self.pr.target_name, "main")

    def test_can_merge_open_pr(self):
        """Test that an open PR with valid branches can be merged."""
        self.assertTrue(self.pr.can_merge)

    def test_cannot_merge_closed_pr(self):
        """Test that a closed PR cannot be merged."""
        self.pr.status = "CLOSED"
        self.pr.save()
        self.assertFalse(self.pr.can_merge)


class ReviewModelTest(TestCase):
    """Tests for the Review model creation."""

    def setUp(self):
        self.author = User.objects.create_user(
            email="author@example.com", password="pass123",
            first_name="Author", last_name="User",
        )
        self.reviewer_user = User.objects.create_user(
            email="reviewer@example.com", password="pass123",
            first_name="Reviewer", last_name="User",
        )
        self.repo = Repository.objects.create(
            name="Review Repo", owner=self.author,
            description="Repo for review tests",
        )
        self.source = Branches.objects.create(
            name="fix", repository=self.repo, created_by=self.author,
        )
        self.target = Branches.objects.create(
            name="main", repository=self.repo,
            is_default=True, created_by=self.author,
        )
        self.pr = PullRequest.objects.create(
            repo=self.repo, source_branch=self.source,
            target_branch=self.target, title="Fix bug",
            description="Fixes a critical bug",
            status="OPEN", created_by=self.author,
        )
        self.review = Review.objects.create(
            pr=self.pr, reviewer=self.reviewer_user,
            status="APPROVED", comment="Looks good!",
        )

    def test_review_creation(self):
        """Test that a review can be created."""
        self.assertEqual(self.review.pr, self.pr)
        self.assertEqual(self.review.reviewer, self.reviewer_user)
        self.assertEqual(self.review.status, "APPROVED")
        self.assertEqual(self.review.comment, "Looks good!")

    def test_review_str(self):
        """Test the string representation of a review."""
        expected = f"Review #{self.review.id} on PR #{self.pr.id} by reviewer@example.com"
        self.assertEqual(str(self.review), expected)

    def test_can_approve_different_user(self):
        """Test that a reviewer who is not the author can approve (if not already approved)."""
        new_review = Review(
            pr=self.pr, reviewer=self.reviewer_user, status="COMMENTED",
        )
        self.assertTrue(new_review.can_approve)

    def test_cannot_approve_own_pr(self):
        """Test that the PR author cannot approve their own PR."""
        author_review = Review(
            pr=self.pr, reviewer=self.author, status="COMMENTED",
        )
        self.assertFalse(author_review.can_approve)


class PullRequestCommentModelTest(TestCase):
    """Tests for the PullRequestComment model creation."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="commenter@example.com", password="pass123",
            first_name="Commenter", last_name="User",
        )
        self.repo = Repository.objects.create(
            name="Comment Repo", owner=self.user,
            description="Repo for comment tests",
        )
        self.source = Branches.objects.create(
            name="dev", repository=self.repo, created_by=self.user,
        )
        self.target = Branches.objects.create(
            name="main", repository=self.repo,
            is_default=True, created_by=self.user,
        )
        self.pr = PullRequest.objects.create(
            repo=self.repo, source_branch=self.source,
            target_branch=self.target, title="Dev changes",
            description="Development changes",
            status="OPEN", created_by=self.user,
        )
        self.comment = PullRequestComment.objects.create(
            pr=self.pr, commenter=self.user,
            comment="This needs a tweak.",
        )

    def test_comment_creation(self):
        """Test that a PR comment can be created."""
        self.assertEqual(self.comment.pr, self.pr)
        self.assertEqual(self.comment.commenter, self.user)
        self.assertEqual(self.comment.comment, "This needs a tweak.")

    def test_comment_str(self):
        """Test the string representation of a PR comment."""
        expected = f"Comment #{self.comment.id} on PR #{self.pr.id} by commenter@example.com"
        self.assertEqual(str(self.comment), expected)

    def test_comment_reply(self):
        """Test that a reply can reference a parent comment."""
        reply = PullRequestComment.objects.create(
            pr=self.pr, commenter=self.user,
            comment="Fixed it!", parent_comment=self.comment,
        )
        self.assertEqual(reply.parent_comment, self.comment)
        self.assertIn(reply, self.comment.replies.all())
