from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model

from repositories.models import Repository
from issues.models import Issue, Label, IssueAssignee, IssueChoices

User = get_user_model()


class LabelConstraintTest(TestCase):
    """Tests for the Label model constraints and edge cases."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="label@example.com", password="pass123",
            first_name="L", last_name="U",
        )
        self.repo = Repository.objects.create(
            name="Label Repo", owner=self.user,
            description="For label tests",
        )
        self.label = Label.objects.create(
            name="bug", color="#ff0000",
            description="Something broken", repo=self.repo,
        )

    # ── Nullable repo FK ──────────────────────────────────────────────

    def test_label_repo_nullable(self):
        """Labels can exist without a repo (repo=null)."""
        orphan = Label.objects.create(
            name="orphan", color="#000000",
            description="No repo",
        )
        self.assertIsNone(orphan.repo)

    # ── Cascade delete ────────────────────────────────────────────────

    def test_deleting_repo_cascades_labels(self):
        label_id = self.label.id
        self.repo.delete()
        self.assertFalse(Label.objects.filter(id=label_id).exists())

    # ── Field lengths ─────────────────────────────────────────────────

    def test_name_max_length(self):
        self.assertEqual(Label._meta.get_field("name").max_length, 100)

    def test_color_max_length(self):
        self.assertEqual(Label._meta.get_field("color").max_length, 7)


class IssueConstraintTest(TestCase):
    """Tests for the Issue model constraints and edge cases."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="issue@example.com", password="pass123",
            first_name="I", last_name="U",
        )
        self.repo = Repository.objects.create(
            name="Issue Repo", owner=self.user,
            description="Test repo",
        )
        self.issue = Issue.objects.create(
            repo=self.repo, title="Test Issue",
            description="Desc", status=IssueChoices.OPEN,
            creator=self.user,
        )

    # ── Status choices ────────────────────────────────────────────────

    def test_status_choices_values(self):
        values = [c[0] for c in IssueChoices.choices]
        self.assertIn("open", values)
        self.assertIn("in_progress", values)
        self.assertIn("closed", values)

    def test_status_in_progress(self):
        self.issue.status = IssueChoices.IN_PROGRESS
        self.issue.save()
        self.issue.refresh_from_db()
        self.assertEqual(self.issue.status, "in_progress")

    # ── closed_at nullable ────────────────────────────────────────────

    def test_closed_at_defaults_null(self):
        self.assertIsNone(self.issue.closed_at)

    # ── Parent self-referential FK ────────────────────────────────────

    def test_parent_nullable(self):
        self.assertIsNone(self.issue.parent)

    def test_deleting_parent_cascades_children(self):
        child = Issue.objects.create(
            repo=self.repo, title="Child", description="Sub",
            status=IssueChoices.OPEN, creator=self.user,
            parent=self.issue,
        )
        child_id = child.id
        self.issue.delete()
        self.assertFalse(Issue.objects.filter(id=child_id).exists())

    # ── ManyToMany labels ─────────────────────────────────────────────

    def test_labels_can_be_empty(self):
        self.assertEqual(self.issue.labels.count(), 0)

    def test_multiple_labels_on_issue(self):
        l1 = Label.objects.create(
            name="bug", color="#f00", description="Bug", repo=self.repo,
        )
        l2 = Label.objects.create(
            name="docs", color="#0f0", description="Docs", repo=self.repo,
        )
        self.issue.labels.add(l1, l2)
        self.assertEqual(self.issue.labels.count(), 2)

    def test_same_label_on_multiple_issues(self):
        label = Label.objects.create(
            name="shared", color="#00f", description="Shared", repo=self.repo,
        )
        issue2 = Issue.objects.create(
            repo=self.repo, title="Issue 2", description="D",
            status=IssueChoices.OPEN, creator=self.user,
        )
        self.issue.labels.add(label)
        issue2.labels.add(label)
        self.assertIn(label, self.issue.labels.all())
        self.assertIn(label, issue2.labels.all())

    # ── Cascade from repo ─────────────────────────────────────────────

    def test_deleting_repo_cascades_issues(self):
        issue_id = self.issue.id
        self.repo.delete()
        self.assertFalse(Issue.objects.filter(id=issue_id).exists())

    # ── Cascade from creator ──────────────────────────────────────────

    def test_deleting_creator_cascades_issues(self):
        issue_id = self.issue.id
        self.user.delete()
        self.assertFalse(Issue.objects.filter(id=issue_id).exists())

    # ── Field lengths ─────────────────────────────────────────────────

    def test_title_max_length(self):
        self.assertEqual(Issue._meta.get_field("title").max_length, 100)

    def test_status_max_length(self):
        self.assertEqual(Issue._meta.get_field("status").max_length, 20)


class IssueAssigneeConstraintTest(TestCase):
    """Tests for the IssueAssignee through-model constraints."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email="a1@example.com", password="pass123",
            first_name="A", last_name="1",
        )
        self.user2 = User.objects.create_user(
            email="a2@example.com", password="pass123",
            first_name="A", last_name="2",
        )
        self.repo = Repository.objects.create(
            name="Assignee Repo", owner=self.user1,
            description="Repo",
        )
        self.issue = Issue.objects.create(
            repo=self.repo, title="Assignable",
            description="Desc", status=IssueChoices.OPEN,
            creator=self.user1,
        )

    # ── assigned_at auto-set ──────────────────────────────────────────

    def test_assigned_at_auto_set(self):
        assignment = IssueAssignee.objects.create(
            issue=self.issue, assignee=self.user1,
        )
        self.assertIsNotNone(assignment.assigned_at)

    # ── Multiple assignees ────────────────────────────────────────────

    def test_multiple_assignees_on_same_issue(self):
        IssueAssignee.objects.create(issue=self.issue, assignee=self.user1)
        IssueAssignee.objects.create(issue=self.issue, assignee=self.user2)
        self.assertEqual(self.issue.assignees.count(), 2)

    # ── Cascade from issue ────────────────────────────────────────────

    def test_deleting_issue_cascades_assignees(self):
        IssueAssignee.objects.create(issue=self.issue, assignee=self.user1)
        issue_id = self.issue.id
        self.issue.delete()
        self.assertFalse(
            IssueAssignee.objects.filter(issue_id=issue_id).exists()
        )

    # ── Cascade from user ─────────────────────────────────────────────

    def test_deleting_assignee_cascades(self):
        IssueAssignee.objects.create(issue=self.issue, assignee=self.user2)
        user2_id = self.user2.id
        self.user2.delete()
        self.assertFalse(
            IssueAssignee.objects.filter(assignee_id=user2_id).exists()
        )
