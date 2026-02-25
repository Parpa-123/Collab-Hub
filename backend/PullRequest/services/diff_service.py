import difflib

def generate_diff(base_commit, head_commit):
    base_files = base_commit.snapshot or {}
    head_files = head_commit.snapshot or {}

    all_files = set(base_files.keys()) | set(head_files.keys())

    diff = []

    for file_path in sorted(all_files):
        base_content = base_files.get(file_path)
        head_content = head_files.get(file_path)

        if base_content is None:
            status = "added"
            base_lines = []
            head_lines = head_content.splitlines()

        elif head_content is None:
            status = "removed"
            base_lines = base_content.splitlines()
            head_lines = []

        else:
            if base_content == head_content:
                continue
            status = "modified"
            base_lines = base_content.splitlines()
            head_lines = head_content.splitlines()

        diff_lines = list(difflib.unified_diff(
            base_lines, head_lines,
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
            lineterm=""
        ))

        additions = sum(1 for line in diff_lines if line.startswith("+") and not line.startswith("+++"))
        deletions = sum(1 for line in diff_lines if line.startswith("-") and not line.startswith("---"))

        diff.append({
            "file_path": file_path,
            "status": status,
            "diff": diff_lines,
            "additions": additions,
            "deletions": deletions,
        })

    return {"files": diff}