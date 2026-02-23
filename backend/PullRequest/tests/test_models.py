from django.test import TestCase
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from repositories.models import Repository
from branches.models import Branches
from PullRequest.models import PullRequest, Review, PullRequestComment

User = get_user_model()


class PullRequestConstraintTest(TestCase):
    """Tests for PullRequest model constraints, validation, and properties."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="pr@example.com", password="pass123",
            first_name="PR", last_name="User",
        )
        self.repo = Repository.objects.create(
            name="PR Repo", owner=self.user,
            description="Repo for PR tests",
        )
        self.main = Branches.objects.create(
            name="main", repository=self.repo,
            is_default=True, created_by=self.user,
        )
        self.feature = Branches.objects.create(
            name="feature", repository=self.repo,
            created_by=self.user,
        )
        self.pr = PullRequest.objects.create(
            repo=self.repo, source_branch=self.feature,
            target_branch=self.main, title="My PR",
            description="Desc", status="OPEN",
            created_by=self.user,
        )

    # ── unique_together (repo, source_branch, target_branch) ─────────

    def test_duplicate_pr_same_branches_raises(self):
        """Same repo + source + target should violate unique_together."""
        with self.assertRaises(IntegrityError):
            PullRequest.objects.create(
                repo=self.repo, source_branch=self.feature,
                target_branch=self.main, title="Dup PR",
                description="D", status="OPEN",
                created_by=self.user,
            )

    def test_different_branches_same_repo_allowed(self):
        hotfix = Branches.objects.create(
            name="hotfix", repository=self.repo,
            created_by=self.user,
        )
        pr2 = PullRequest.objects.create(
            repo=self.repo, source_branch=hotfix,
            target_branch=self.main, title="Hotfix PR",
            description="Fix", status="OPEN",
            created_by=self.user,
        )
        self.assertEqual(pr2.title, "Hotfix PR")

    # ── clean() validation ────────────────────────────────────────────

    def test_clean_same_source_and_target_raises(self):
        pr = PullRequest(
            repo=self.repo, source_branch=self.main,
            target_branch=self.main, title="Bad",
            description="X", status="OPEN",
            created_by=self.user,
        )
        with self.assertRaises(ValidationError):
            pr.clean()

    def test_clean_branches_different_repos_raises(self):
        other_repo = Repository.objects.create(
            name="Other Repo", owner=self.user,
            description="Other",
            slug="other-repo",
        )
        source_branch = Branches.objects.create(
            name="feat", repository=other_repo,
            created_by=self.user,
        )
        pr = PullRequest(
            repo=self.repo, source_branch=source_branch,
            target_branch=self.main, title="Cross repo",
            description="X", status="OPEN",
            created_by=self.user,
        )
        with self.assertRaises(ValidationError):
            pr.clean()

    # ── save() auto-populates branch names ────────────────────────────

    def test_source_name_auto_set(self):
        self.assertEqual(self.pr.source_name, "feature")

    def test_target_name_auto_set(self):
        self.assertEqual(self.pr.target_name, "main")

    def test_branch_names_update_when_branch_changes(self):
        hotfix = Branches.objects.create(
            name="hotfix", repository=self.repo,
            created_by=self.user,
        )
        self.pr.source_branch = hotfix
        self.pr.save()
        self.pr.refresh_from_db()
        self.assertEqual(self.pr.source_name, "hotfix")

    # ── Status choices ────────────────────────────────────────────────

    def test_status_choices_values(self):
        values = [c[0] for c in PullRequest.STATUS_CHOICES]
        self.assertIn("OPEN", values)
        self.assertIn("APPROVED", values)
        self.assertIn("CHANGES_REQUESTED", values)
        self.assertIn("MERGED", values)
        self.assertIn("CLOSED", values)

    # ── Nullable fields ───────────────────────────────────────────────

    def test_merged_by_nullable(self):
        self.assertIsNone(self.pr.merged_by)

    def test_merged_at_nullable(self):
        self.assertIsNone(self.pr.merged_at)

    def test_closed_at_nullable(self):
        self.assertIsNone(self.pr.closed_at)

    def test_source_branch_nullable(self):
        pr = PullRequest.objects.create(
            repo=self.repo, source_branch=None,
            target_branch=self.main, title="Orphan source",
            description="D", status="OPEN",
            created_by=self.user,
            source_name="deleted-branch",
        )
        self.assertIsNone(pr.source_branch)

    # ── Properties ────────────────────────────────────────────────────

    def test_source_branch_deleted_false_when_present(self):
        self.assertFalse(self.pr.source_branch_deleted)

    def test_source_branch_deleted_true_when_none(self):
        self.pr.source_branch = None
        self.pr.source_name = "old-feature"
        self.assertTrue(self.pr.source_branch_deleted)

    def test_source_branch_deleted_false_for_main(self):
        """source_branch=None but source_name='main' → not considered deleted."""
        self.pr.source_branch = None
        self.pr.source_name = "main"
        self.assertFalse(self.pr.source_branch_deleted)

    def test_can_merge_true_for_open_with_branches(self):
        self.assertTrue(self.pr.can_merge)

    def test_can_merge_false_when_closed(self):
        self.pr.status = "CLOSED"
        self.assertFalse(self.pr.can_merge)

    def test_can_merge_false_when_source_deleted(self):
        self.pr.source_branch = None
        self.pr.source_name = "gone"
        self.assertFalse(self.pr.can_merge)

    def test_can_close_true_when_open(self):
        self.assertTrue(self.pr.can_close)

    def test_can_close_false_when_already_closed(self):
        self.pr.status = "CLOSED"
        self.assertFalse(self.pr.can_close)

    def test_can_reopen_true_when_closed(self):
        self.pr.status = "CLOSED"
        self.assertTrue(self.pr.can_reopen)

    def test_can_reopen_false_when_open(self):
        self.assertFalse(self.pr.can_reopen)

    # ── Cascade ───────────────────────────────────────────────────────

    def test_deleting_repo_cascades_prs(self):
        pr_id = self.pr.id
        self.repo.delete()
        self.assertFalse(PullRequest.objects.filter(id=pr_id).exists())


class ReviewConstraintTest(TestCase):
    """Tests for the Review model constraints and properties."""

    def setUp(self):
        self.author = User.objects.create_user(
            email="author@example.com", password="pass123",
            first_name="A", last_name="U",
        )
        self.reviewer_user = User.objects.create_user(
            email="reviewer@example.com", password="pass123",
            first_name="R", last_name="U",
        )
        self.repo = Repository.objects.create(
            name="Review Repo", owner=self.author,
            description="Repo",
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
            target_branch=self.target, title="Fix",
            description="Fix stuff", status="OPEN",
            created_by=self.author,
        )
        self.review = Review.objects.create(
            pr=self.pr, reviewer=self.reviewer_user,
            status="APPROVED", comment="LGTM",
        )

    # ── unique_together (pr, reviewer) ────────────────────────────────

    def test_duplicate_review_same_pr_reviewer_raises(self):
        with self.assertRaises(IntegrityError):
            Review.objects.create(
                pr=self.pr, reviewer=self.reviewer_user,
                status="COMMENTED", comment="Duplicate attempt",
            )

    def test_same_reviewer_different_pr_allowed(self):
        hotfix = Branches.objects.create(
            name="hotfix", repository=self.repo, created_by=self.author,
        )
        pr2 = PullRequest.objects.create(
            repo=self.repo, source_branch=hotfix,
            target_branch=self.target, title="Hotfix",
            description="H", status="OPEN",
            created_by=self.author,
        )
        review2 = Review.objects.create(
            pr=pr2, reviewer=self.reviewer_user,
            status="APPROVED", comment="Looks good",
        )
        self.assertEqual(review2.reviewer, self.reviewer_user)

    # ── Status choices ────────────────────────────────────────────────

    def test_review_status_choices(self):
        values = [c[0] for c in Review.REVIEW_STATUS]
        self.assertIn("APPROVED", values)
        self.assertIn("CHANGES_REQUESTED", values)
        self.assertIn("COMMENTED", values)

    # ── comment blank allowed ──────────────────────────────────────────

    def test_comment_blank_allowed(self):
        """Review comment can be an empty string."""
        hotfix = Branches.objects.create(
            name="hotfix2", repository=self.repo, created_by=self.author,
        )
        pr2 = PullRequest.objects.create(
            repo=self.repo, source_branch=hotfix,
            target_branch=self.target, title="H2",
            description="H", status="OPEN",
            created_by=self.author,
        )
        review = Review.objects.create(
            pr=pr2, reviewer=self.reviewer_user,
            status="APPROVED", comment="",
        )
        self.assertEqual(review.comment, "")

    # ── can_approve property ──────────────────────────────────────────

    def test_can_approve_false_for_author(self):
        """PR author reviewing their own PR cannot approve."""
        r = Review(pr=self.pr, reviewer=self.author, status="COMMENTED")
        self.assertFalse(r.can_approve)

    def test_can_approve_false_if_already_approved(self):
        r = Review(pr=self.pr, reviewer=self.reviewer_user, status="APPROVED")
        self.assertFalse(r.can_approve)

    def test_can_approve_true_for_different_user_not_approved(self):
        third = User.objects.create_user(
            email="third@example.com", password="pass123",
            first_name="T", last_name="U",
        )
        r = Review(pr=self.pr, reviewer=third, status="COMMENTED")
        self.assertTrue(r.can_approve)

    # ── Cascade ───────────────────────────────────────────────────────

    def test_deleting_pr_cascades_reviews(self):
        review_id = self.review.id
        self.pr.delete()
        self.assertFalse(Review.objects.filter(id=review_id).exists())

    def test_deleting_reviewer_cascades_reviews(self):
        review_id = self.review.id
        self.reviewer_user.delete()
        self.assertFalse(Review.objects.filter(id=review_id).exists())


class PullRequestCommentConstraintTest(TestCase):
    """Tests for PullRequestComment model constraints."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="commenter@example.com", password="pass123",
            first_name="C", last_name="U",
        )
        self.repo = Repository.objects.create(
            name="Comment Repo", owner=self.user,
            description="Repo",
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
            target_branch=self.target, title="Dev PR",
            description="D", status="OPEN",
            created_by=self.user,
        )
        self.comment = PullRequestComment.objects.create(
            pr=self.pr, commenter=self.user,
            comment="First comment",
        )

    # ── unique_together (pr, commenter, comment) ──────────────────────

    def test_duplicate_exact_comment_raises(self):
        """Same commenter cannot post the exact same comment text on the same PR."""
        with self.assertRaises(IntegrityError):
            PullRequestComment.objects.create(
                pr=self.pr, commenter=self.user,
                comment="First comment",
            )

    def test_same_commenter_different_text_allowed(self):
        c2 = PullRequestComment.objects.create(
            pr=self.pr, commenter=self.user,
            comment="Second comment",
        )
        self.assertEqual(c2.comment, "Second comment")

    def test_same_text_different_commenter_allowed(self):
        other = User.objects.create_user(
            email="other@example.com", password="pass123",
            first_name="O", last_name="U",
        )
        c2 = PullRequestComment.objects.create(
            pr=self.pr, commenter=other,
            comment="First comment",
        )
        self.assertEqual(c2.commenter, other)

    # ── parent_comment nullable ───────────────────────────────────────

    def test_parent_comment_nullable(self):
        self.assertIsNone(self.comment.parent_comment)

    # ── threading ─────────────────────────────────────────────────────

    def test_reply_links_to_parent(self):
        reply = PullRequestComment.objects.create(
            pr=self.pr, commenter=self.user,
            comment="Reply text",
            parent_comment=self.comment,
        )
        self.assertEqual(reply.parent_comment, self.comment)

    def test_replies_reverse_relation(self):
        reply = PullRequestComment.objects.create(
            pr=self.pr, commenter=self.user,
            comment="A reply",
            parent_comment=self.comment,
        )
        self.assertIn(reply, self.comment.replies.all())

    def test_deleting_parent_comment_cascades_replies(self):
        reply = PullRequestComment.objects.create(
            pr=self.pr, commenter=self.user,
            comment="To be cascaded",
            parent_comment=self.comment,
        )
        reply_id = reply.id
        self.comment.delete()
        self.assertFalse(
            PullRequestComment.objects.filter(id=reply_id).exists()
        )

    # ── Cascade from PR ───────────────────────────────────────────────

    def test_deleting_pr_cascades_comments(self):
        comment_id = self.comment.id
        self.pr.delete()
        self.assertFalse(
            PullRequestComment.objects.filter(id=comment_id).exists()
        )

    # ── Cascade from user ─────────────────────────────────────────────

    def test_deleting_commenter_cascades_comments(self):
        comment_id = self.comment.id
        self.user.delete()
        self.assertFalse(
            PullRequestComment.objects.filter(id=comment_id).exists()
        )
