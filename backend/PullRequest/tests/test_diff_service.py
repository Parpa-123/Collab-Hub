from django.test import SimpleTestCase
from unittest.mock import Mock

from PullRequest.services.diff_service import generate_diff


def _make_commit(snapshot):
    """Create a lightweight mock commit with the given snapshot dict."""
    commit = Mock()
    commit.snapshot = snapshot
    return commit


class GenerateDiffTest(SimpleTestCase):
    """Pure-logic tests for generate_diff – no database needed."""

    # ── Basic: modified file ──────────────────────────────────────────

    def test_modified_file_detected(self):
        base = _make_commit({"app.py": "print('hello')"})
        head = _make_commit({"app.py": "print('world')"})
        result = generate_diff(base, head)

        self.assertEqual(len(result["files"]), 1)
        entry = result["files"][0]
        self.assertEqual(entry["file_path"], "app.py")
        self.assertEqual(entry["status"], "modified")
        self.assertGreater(len(entry["diff"]), 0)

    def test_modified_file_counts(self):
        """Additions/deletions must NOT include unified-diff header lines."""
        base = _make_commit({"f.txt": "aaa"})
        head = _make_commit({"f.txt": "bbb"})
        result = generate_diff(base, head)
        entry = result["files"][0]

        # One line removed ("aaa"), one line added ("bbb")
        self.assertEqual(entry["additions"], 1)
        self.assertEqual(entry["deletions"], 1)

    # ── Added file ────────────────────────────────────────────────────

    def test_added_file_when_absent_in_base(self):
        """File present only in head → status 'added'."""
        base = _make_commit({})
        head = _make_commit({"new.txt": "content"})
        result = generate_diff(base, head)

        self.assertEqual(len(result["files"]), 1)
        entry = result["files"][0]
        self.assertEqual(entry["status"], "added")
        self.assertEqual(entry["additions"], 1)
        self.assertEqual(entry["deletions"], 0)

    def test_added_file_when_null_in_base(self):
        """File explicitly set to null in base snapshot → status 'added'."""
        base = _make_commit({"new.txt": None})
        head = _make_commit({"new.txt": "content"})
        result = generate_diff(base, head)

        entry = result["files"][0]
        self.assertEqual(entry["status"], "added")

    # ── Removed file ──────────────────────────────────────────────────

    def test_removed_file_when_absent_in_head(self):
        """File present only in base → status 'removed'."""
        base = _make_commit({"old.txt": "bye"})
        head = _make_commit({})
        result = generate_diff(base, head)

        self.assertEqual(len(result["files"]), 1)
        entry = result["files"][0]
        self.assertEqual(entry["status"], "removed")
        self.assertEqual(entry["additions"], 0)
        self.assertEqual(entry["deletions"], 1)

    def test_removed_file_when_null_in_head(self):
        """File explicitly set to null in head snapshot → status 'removed'."""
        base = _make_commit({"old.txt": "bye"})
        head = _make_commit({"old.txt": None})
        result = generate_diff(base, head)

        entry = result["files"][0]
        self.assertEqual(entry["status"], "removed")

    # ── Identical / unchanged files ───────────────────────────────────

    def test_identical_file_skipped(self):
        """Files with same content in both commits should be excluded."""
        base = _make_commit({"same.txt": "unchanged"})
        head = _make_commit({"same.txt": "unchanged"})
        result = generate_diff(base, head)

        self.assertEqual(len(result["files"]), 0)

    # ── Empty / None snapshots ────────────────────────────────────────

    def test_both_snapshots_empty(self):
        result = generate_diff(_make_commit({}), _make_commit({}))
        self.assertEqual(result, {"files": []})

    def test_both_snapshots_none(self):
        result = generate_diff(_make_commit(None), _make_commit(None))
        self.assertEqual(result, {"files": []})

    def test_base_none_head_has_files(self):
        base = _make_commit(None)
        head = _make_commit({"a.py": "x"})
        result = generate_diff(base, head)

        self.assertEqual(len(result["files"]), 1)
        self.assertEqual(result["files"][0]["status"], "added")

    def test_base_has_files_head_none(self):
        base = _make_commit({"a.py": "x"})
        head = _make_commit(None)
        result = generate_diff(base, head)

        self.assertEqual(len(result["files"]), 1)
        self.assertEqual(result["files"][0]["status"], "removed")

    # ── Multiple files ────────────────────────────────────────────────

    def test_multiple_files_sorted_by_path(self):
        base = _make_commit({"z.py": "old", "a.py": "old"})
        head = _make_commit({"z.py": "new", "a.py": "new"})
        result = generate_diff(base, head)

        paths = [f["file_path"] for f in result["files"]]
        self.assertEqual(paths, ["a.py", "z.py"])

    def test_mix_of_added_removed_modified(self):
        base = _make_commit({
            "keep.py": "same",
            "modify.py": "v1",
            "remove.py": "bye",
        })
        head = _make_commit({
            "keep.py": "same",
            "modify.py": "v2",
            "add.py": "hello",
        })
        result = generate_diff(base, head)

        statuses = {f["file_path"]: f["status"] for f in result["files"]}
        self.assertEqual(statuses["add.py"], "added")
        self.assertEqual(statuses["modify.py"], "modified")
        self.assertEqual(statuses["remove.py"], "removed")
        # "keep.py" should be excluded (unchanged)
        self.assertNotIn("keep.py", statuses)

    # ── Multiline content ─────────────────────────────────────────────

    def test_multiline_additions_and_deletions(self):
        base = _make_commit({"f.txt": "line1\nline2\nline3"})
        head = _make_commit({"f.txt": "line1\nchanged\nline3\nline4"})
        result = generate_diff(base, head)

        entry = result["files"][0]
        # "line2" removed, "changed" + "line4" added
        self.assertEqual(entry["deletions"], 1)
        self.assertEqual(entry["additions"], 2)

    def test_diff_lines_contain_actual_changes(self):
        base = _make_commit({"f.txt": "alpha\nbeta"})
        head = _make_commit({"f.txt": "alpha\ngamma"})
        result = generate_diff(base, head)

        raw = "\n".join(result["files"][0]["diff"])
        self.assertIn("-beta", raw)
        self.assertIn("+gamma", raw)

    # ── Diff output structure ─────────────────────────────────────────

    def test_diff_entry_keys(self):
        base = _make_commit({"x.py": "a"})
        head = _make_commit({"x.py": "b"})
        result = generate_diff(base, head)

        entry = result["files"][0]
        expected_keys = {"file_path", "status", "diff", "additions", "deletions"}
        self.assertEqual(set(entry.keys()), expected_keys)

    def test_result_has_files_key(self):
        result = generate_diff(_make_commit({}), _make_commit({}))
        self.assertIn("files", result)
        self.assertIsInstance(result["files"], list)
