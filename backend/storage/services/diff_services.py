import difflib
from storage.models import Blob

def gen_diff(old_content: str, new_content: str, fromfile: str = "", tofile: str = ""):
    old_lines = old_content.splitlines() if old_content else []
    new_lines = new_content.splitlines() if new_content else []
    diff = difflib.unified_diff(old_lines, new_lines, fromfile=fromfile, tofile=tofile, lineterm="")
    return list(diff)

def generate_diff(base_commit, head_commit):
    base_files = base_commit.snapshot or {}
    head_files = head_commit.snapshot or {}

    all_files = set(base_files.keys()) | set(head_files.keys())
    diff = []

    for file_path in sorted(all_files):
        base_blob_id = base_files.get(file_path)
        head_blob_id = head_files.get(file_path)

        base_blob = Blob.objects.filter(id=base_blob_id).first() if base_blob_id else None
        head_blob = Blob.objects.filter(id=head_blob_id).first() if head_blob_id else None

        base_content = base_blob.content if base_blob else ""
        head_content = head_blob.content if head_blob else ""

        if not base_blob_id:
            status = "added"
        elif not head_blob_id:
            status = "removed"
        else:
            if base_content == head_content:
                continue
            status = "modified"

        diff_lines = gen_diff(
            base_content, 
            head_content, 
            fromfile=f"a/{file_path}", 
            tofile=f"b/{file_path}"
        )

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