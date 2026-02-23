from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomUserConstraintTest(TestCase):
    """Tests for CustomUser model constraints and edge cases."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="unique@example.com",
            password="testpass123",
            first_name="First",
            last_name="Last",
        )

    # ── Unique email constraint ──────────────────────────────────────

    def test_duplicate_email_raises_integrity_error(self):
        """Two users with the same email should violate the unique constraint."""
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                email="unique@example.com",
                password="otherpass",
            )

    def test_email_is_normalized(self):
        """Email domain should be lowercased during creation."""
        user = User.objects.create_user(
            email="Test@EXAMPLE.COM", password="pass123",
        )
        self.assertEqual(user.email, "Test@example.com")

    # ── Defaults ─────────────────────────────────────────────────────

    def test_is_active_default_true(self):
        self.assertTrue(self.user.is_active)

    def test_is_staff_default_false(self):
        self.assertFalse(self.user.is_staff)

    def test_is_superuser_default_false(self):
        self.assertFalse(self.user.is_superuser)

    def test_bio_default_blank(self):
        self.assertEqual(self.user.bio, "")

    def test_first_name_blank_allowed(self):
        user = User.objects.create_user(
            email="nofirst@example.com", password="pass123",
        )
        self.assertEqual(user.first_name, "")

    def test_last_name_blank_allowed(self):
        user = User.objects.create_user(
            email="nolast@example.com", password="pass123",
        )
        self.assertEqual(user.last_name, "")

    # ── Password hashing ─────────────────────────────────────────────

    def test_password_is_hashed(self):
        """Raw password should never be stored in plain text."""
        self.assertNotEqual(self.user.password, "testpass123")
        self.assertTrue(self.user.check_password("testpass123"))

    def test_check_password_wrong(self):
        self.assertFalse(self.user.check_password("wrongpass"))

    # ── Manager methods ───────────────────────────────────────────────

    def test_create_user_without_email_raises_value_error(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="pass123")

    def test_create_superuser_is_staff_true(self):
        admin = User.objects.create_superuser(
            email="admin@example.com", password="admin123",
            first_name="A", last_name="B",
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_create_superuser_is_staff_false_raises(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="bad@example.com", password="pass",
                is_staff=False,
            )

    def test_create_superuser_is_superuser_false_raises(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="bad2@example.com", password="pass",
                is_superuser=False,
            )

    # ── Timestamps (from CommonModel) ─────────────────────────────────

    def test_created_at_auto_set(self):
        self.assertIsNotNone(self.user.created_at)

    def test_updated_at_auto_set(self):
        self.assertIsNotNone(self.user.updated_at)

    def test_updated_at_changes_on_save(self):
        old_updated = self.user.updated_at
        self.user.bio = "Updated bio"
        self.user.save()
        self.user.refresh_from_db()
        self.assertGreaterEqual(self.user.updated_at, old_updated)

    # ── USERNAME_FIELD ────────────────────────────────────────────────

    def test_username_field_is_email(self):
        self.assertEqual(User.USERNAME_FIELD, "email")

    def test_required_fields(self):
        self.assertIn("first_name", User.REQUIRED_FIELDS)
        self.assertIn("last_name", User.REQUIRED_FIELDS)
