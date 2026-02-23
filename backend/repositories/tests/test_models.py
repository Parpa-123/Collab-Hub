from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model

from repositories.models import Repository, RepositoryMember

User = get_user_model()


class RepositoryConstraintTest(TestCase):
    """Tests for Repository model constraints and edge cases."""

    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com", password="pass123",
            first_name="Owner", last_name="User",
        )
        self.repo = Repository.objects.create(
            name="My Repo", owner=self.owner,
            description="Test repo",
            visibility=Repository.Visibility.PUBLIC,
        )

    # ── unique_together (name, owner) ─────────────────────────────────

    def test_duplicate_name_same_owner_raises(self):
        """Same owner cannot have two repos with the same name."""
        with self.assertRaises(IntegrityError):
            Repository.objects.create(
                name="My Repo", owner=self.owner,
                description="Duplicate",
            )

    def test_same_name_different_owner_allowed(self):
        """Different owners can have repos with the same name."""
        other = User.objects.create_user(
            email="other@example.com", password="pass123",
            first_name="Other", last_name="User",
        )
        repo2 = Repository.objects.create(
            name="My Repo", owner=other, description="Same name",
            slug="my-repo-other",  # explicit slug to avoid auto-slug collision
        )
        self.assertEqual(repo2.name, "My Repo")

    # ── Slug ──────────────────────────────────────────────────────────

    def test_slug_auto_generated_on_create(self):
        self.assertEqual(self.repo.slug, "my-repo")

    def test_slug_not_overwritten_on_update(self):
        """Once a slug is set, updating the name should not change it."""
        self.repo.name = "Renamed Repo"
        self.repo.save()
        self.repo.refresh_from_db()
        self.assertEqual(self.repo.slug, "my-repo")

    def test_slug_unique_constraint(self):
        """Two repos cannot share the same slug."""
        with self.assertRaises(IntegrityError):
            Repository.objects.create(
                name="My Repo Different Owner",
                owner=User.objects.create_user(
                    email="slug@example.com", password="pass",
                    first_name="S", last_name="U",
                ),
                description="Slug collision",
                slug="my-repo",  # force duplicate slug
            )

    # ── Visibility choices ────────────────────────────────────────────

    def test_default_visibility_is_private(self):
        repo = Repository.objects.create(
            name="Private Repo", owner=self.owner,
            description="Defaults to private",
        )
        self.assertEqual(repo.visibility, "private")

    def test_visibility_public(self):
        self.assertEqual(self.repo.visibility, "public")

    def test_visibility_choices_values(self):
        values = [c[0] for c in Repository.Visibility.choices]
        self.assertIn("public", values)
        self.assertIn("private", values)

    # ── Default branch ────────────────────────────────────────────────

    def test_default_branch_is_main(self):
        self.assertEqual(self.repo.default_branch, "main")

    # ── Meta ──────────────────────────────────────────────────────────

    def test_verbose_name(self):
        self.assertEqual(Repository._meta.verbose_name, "Repository")

    def test_verbose_name_plural(self):
        self.assertEqual(Repository._meta.verbose_name_plural, "Repositories")


class RepositoryMemberConstraintTest(TestCase):
    """Tests for RepositoryMember model constraints."""

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
            name="Team Repo", owner=self.owner,
            description="Collab repo",
        )
        self.membership = RepositoryMember.objects.create(
            developer=self.member_user, repository=self.repo,
            role=RepositoryMember.Role.MAINTAINER,
        )

    # ── unique_together (developer, repository) ──────────────────────

    def test_duplicate_membership_raises(self):
        """A user cannot be added to the same repo twice."""
        with self.assertRaises(IntegrityError):
            RepositoryMember.objects.create(
                developer=self.member_user, repository=self.repo,
                role=RepositoryMember.Role.MEMBER,
            )

    def test_same_user_different_repo_allowed(self):
        repo2 = Repository.objects.create(
            name="Other Repo", owner=self.owner,
            description="Another repo",
        )
        member2 = RepositoryMember.objects.create(
            developer=self.member_user, repository=repo2,
        )
        self.assertEqual(member2.developer, self.member_user)

    # ── Role choices & default ────────────────────────────────────────

    def test_default_role_is_member(self):
        m = RepositoryMember.objects.create(
            developer=self.owner, repository=self.repo,
        )
        self.assertEqual(m.role, "member")

    def test_role_choices_values(self):
        values = [c[0] for c in RepositoryMember.Role.choices]
        self.assertIn("admin", values)
        self.assertIn("maintainer", values)
        self.assertIn("member", values)

    # ── Cascade delete ────────────────────────────────────────────────

    def test_deleting_repo_cascades_to_members(self):
        repo_id = self.repo.id
        self.repo.delete()
        self.assertFalse(
            RepositoryMember.objects.filter(repository_id=repo_id).exists()
        )

    def test_deleting_user_cascades_to_memberships(self):
        user_id = self.member_user.id
        self.member_user.delete()
        self.assertFalse(
            RepositoryMember.objects.filter(developer_id=user_id).exists()
        )

    # ── Meta ──────────────────────────────────────────────────────────

    def test_verbose_name(self):
        self.assertEqual(RepositoryMember._meta.verbose_name, "Repository Member")

    def test_verbose_name_plural(self):
        self.assertEqual(RepositoryMember._meta.verbose_name_plural, "Repository Members")
