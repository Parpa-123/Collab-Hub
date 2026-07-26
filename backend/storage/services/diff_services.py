import difflib
import uuid
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
    
    all_blob_ids = set()
    for b_id in base_files.values():
        if b_id:
            try:
                all_blob_ids.add(uuid.UUID(str(b_id)))
            except ValueError:
                pass
    for h_id in head_files.values():
        if h_id:
            try:
                all_blob_ids.add(uuid.UUID(str(h_id)))
            except ValueError:
                pass
                
    blobs_dict = Blob.objects.in_bulk(list(all_blob_ids))
    diff = []

    for file_path in sorted(all_files):
        base_blob_id = base_files.get(file_path)
        head_blob_id = head_files.get(file_path)

        if base_blob_id and head_blob_id and str(base_blob_id) == str(head_blob_id):
            continue

        base_blob = None
        if base_blob_id:
            try:
                base_blob = blobs_dict.get(uuid.UUID(str(base_blob_id)))
            except ValueError:
                pass
                
        head_blob = None
        if head_blob_id:
            try:
                head_blob = blobs_dict.get(uuid.UUID(str(head_blob_id)))
            except ValueError:
                pass

        if not base_blob_id:
            status = "added"
        elif not head_blob_id:
            status = "removed"
        else:
            if base_blob is None or head_blob is None:
                # Missing blob integrity issue
                diff.append({
                    "file_path": file_path,
                    "status": "error",
                    "diff": ["Error: Referenced file blob is missing or corrupt in storage."],
                    "additions": 0,
                    "deletions": 0,
                })
                continue

            base_content = base_blob.content
            head_content = head_blob.content

            if base_content == head_content:
                continue
            status = "modified"

        base_content = base_blob.content if base_blob else ""
        head_content = head_blob.content if head_blob else ""

        is_binary = (base_blob and base_blob.is_binary) or (head_blob and head_blob.is_binary)
        if is_binary:
            diff_lines = [f"Binary files a/{file_path} and b/{file_path} differ"]
            additions = 0
            deletions = 0
        else:
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