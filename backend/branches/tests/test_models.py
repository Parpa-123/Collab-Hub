from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model

from repositories.models import Repository
from branches.models import Branches, Commit

User = get_user_model()


class BranchesConstraintTest(TestCase):
    """Tests for the Branches model constraints and edge cases."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="branch@example.com", password="pass123",
            first_name="B", last_name="U",
        )
        self.repo = Repository.objects.create(
            name="Branch Repo", owner=self.user,
            description="Repo for branches",
        )
        self.main = Branches.objects.create(
            name="main", repository=self.repo,
            is_default=True, created_by=self.user,
        )

    # ── unique_together (name, repository) ────────────────────────────

    def test_duplicate_branch_name_same_repo_raises(self):
        """Two branches in the same repo cannot share a name."""
        with self.assertRaises(IntegrityError):
            Branches.objects.create(
                name="main", repository=self.repo,
                created_by=self.user,
            )

    def test_same_branch_name_different_repo_allowed(self):
        repo2 = Repository.objects.create(
            name="Other Repo", owner=self.user,
            description="Different repo",
        )
        branch = Branches.objects.create(
            name="main", repository=repo2,
            is_default=True, created_by=self.user,
        )
        self.assertEqual(branch.name, "main")

    # ── Defaults ──────────────────────────────────────────────────────

    def test_is_default_false_by_default(self):
        dev = Branches.objects.create(
            name="dev", repository=self.repo,
            created_by=self.user,
        )
        self.assertFalse(dev.is_default)

    def test_is_protected_false_by_default(self):
        dev = Branches.objects.create(
            name="dev", repository=self.repo,
            created_by=self.user,
        )
        self.assertFalse(dev.is_protected)

    # ── Self-referential FK (created_from) ────────────────────────────

    def test_created_from_nullable(self):
        self.assertIsNone(self.main.created_from)

    def test_created_from_links_to_parent_branch(self):
        feature = Branches.objects.create(
            name="feature-x", repository=self.repo,
            created_by=self.user, created_from=self.main,
        )
        self.assertEqual(feature.created_from, self.main)

    def test_deleting_parent_branch_cascades(self):
        """Deleting a parent branch cascades to child branches."""
        feature = Branches.objects.create(
            name="feature-y", repository=self.repo,
            created_by=self.user, created_from=self.main,
        )
        feature_id = feature.id
        self.main.delete()
        self.assertFalse(Branches.objects.filter(id=feature_id).exists())

    # ── Cascade from repo ─────────────────────────────────────────────

    def test_deleting_repo_cascades_branches(self):
        branch_id = self.main.id
        self.repo.delete()
        self.assertFalse(Branches.objects.filter(id=branch_id).exists())

    # ── Cascade from user ─────────────────────────────────────────────

    def test_deleting_creator_cascades_branches(self):
        branch_id = self.main.id
        self.user.delete()
        self.assertFalse(Branches.objects.filter(id=branch_id).exists())

    # ── Meta ──────────────────────────────────────────────────────────

    def test_verbose_name(self):
        self.assertEqual(Branches._meta.verbose_name, "Branch")

    def test_verbose_name_plural(self):
        self.assertEqual(Branches._meta.verbose_name_plural, "Branches")

    # ── Field lengths ─────────────────────────────────────────────────

    def test_name_max_length(self):
        self.assertEqual(Branches._meta.get_field("name").max_length, 100)


class CommitConstraintTest(TestCase):
    """Tests for the Commit model constraints and cascade deletions."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="commit@example.com", password="pass123",
            first_name="C", last_name="U",
        )
        self.repo = Repository.objects.create(
            name="Commit Repo", owner=self.user,
            description="Repo for commits",
        )
        self.branch = Branches.objects.create(
            name="main", repository=self.repo,
            is_default=True, created_by=self.user,
        )
        self.commit = Commit.objects.create(
            repository=self.repo, branch=self.branch,
            message="Initial commit", author=self.user,
            snapshot={"files": ["README.md"]}
        )

    # ── Basic Creation ────────────────────────────────────────────────

    def test_commit_creation(self):
        self.assertEqual(self.commit.message, "Initial commit")
        self.assertEqual(self.commit.author, self.user)
        self.assertEqual(self.commit.branch, self.branch)

    def test_commit_str(self):
        expected = f"Commit {self.commit.id} on main"
        self.assertEqual(str(self.commit), expected)

    # ── Parent / Second Parent (SET_NULL) ─────────────────────────────

    def test_parent_nullable(self):
        self.assertIsNone(self.commit.parent)

    def test_second_parent_nullable(self):
        self.assertIsNone(self.commit.second_parent)

    def test_parent_deletion_sets_null(self):
        child = Commit.objects.create(
            repository=self.repo, branch=self.branch,
            message="Second commit", author=self.user,
            parent=self.commit
        )
        self.commit.delete()
        child.refresh_from_db()
        self.assertIsNone(child.parent)

    # ── Cascade ───────────────────────────────────────────────────────

    def test_deleting_branch_cascades_commits(self):
        commit_id = self.commit.id
        self.branch.delete()
        self.assertFalse(Commit.objects.filter(id=commit_id).exists())

    def test_deleting_repo_cascades_commits(self):
        commit_id = self.commit.id
        self.repo.delete()
        self.assertFalse(Commit.objects.filter(id=commit_id).exists())

    def test_deleting_author_cascades_commits(self):
        commit_id = self.commit.id
        self.user.delete()
        self.assertFalse(Commit.objects.filter(id=commit_id).exists())

    # ── Ordering ──────────────────────────────────────────────────────

    def test_commit_ordering_newest_first(self):
        Commit.objects.create(
            repository=self.repo, branch=self.branch,
            message="Second", author=self.user
        )
        commits = Commit.objects.all()
        self.assertEqual(commits[0].message, "Second")
        self.assertEqual(commits[1].message, "Initial commit")
