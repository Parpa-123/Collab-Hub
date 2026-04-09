from celery import shared_task
from django.core.cache import cache
from .models import PullRequest
from storage.models import TreeNode
import logging
import time

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def store_diff(self, pr_id):
    """
    Precomputes and stores the diff for a pull request.
    Uses debounce locking to skip execution if a newer task was queued.
    """
    cache_key = f"pr_{pr_id}_diff_task_id"
    expected_task_id = cache.get(cache_key)
    
    # Debouncing: check if this task is the latest one queued
    if expected_task_id and self.request.id and self.request.id != expected_task_id:
        logger.info(f"Skipping stale diff task {self.request.id} for PR {pr_id}")
        return

    start_time = time.time()
    logger.info(f"Starting diff generation job for PR {pr_id}...")

    try:
        pr = PullRequest.objects.get(id=pr_id)
        if not pr.base_commit or not pr.source_branch or not pr.source_branch.head_commit:
            pr.diff_status = "FAILED"
            pr.save()
            return

        pr.diff_status = "PROCESSING"
        pr.save()

        base_tree = getattr(pr.base_commit, 'tree', None)
        source_tree = getattr(pr.source_branch.head_commit, 'tree', None)

        if not base_tree or not source_tree:
            pr.diff_status = "FAILED"
            pr.save()
            return

        base_nodes = {
            node.path: node 
            for node in TreeNode.objects.filter(tree=base_tree, type="file").select_related('blob')
        }

        source_nodes = {
            node.path: node 
            for node in TreeNode.objects.filter(tree=source_tree, type="file").select_related('blob')
        }

        all_path = set(base_nodes.keys()) | set(source_nodes.keys())
        diff_response = []

        import difflib

        for path in all_path:
            base_node = base_nodes.get(path)
            source_node = source_nodes.get(path)

            old_content = base_node.blob.content if base_node and base_node.blob else ""
            new_content = source_node.blob.content if source_node and source_node.blob else ""

            if old_content == new_content:
                continue

            file_status = "modified"
            if not old_content and new_content:
                file_status = "added"
            elif old_content and not new_content:
                file_status = "removed"

            old_lines = old_content.splitlines() if old_content else []
            new_lines = new_content.splitlines() if new_content else []
            diff_lines = list(difflib.unified_diff(
                old_lines, new_lines, 
                fromfile=f"a/{path}", tofile=f"b/{path}", lineterm=""
            ))

            additions = sum(1 for line in diff_lines if line.startswith("+") and not line.startswith("+++"))
            deletions = sum(1 for line in diff_lines if line.startswith("-") and not line.startswith("---"))

            diff_response.append({
                "file_path": path,
                "status": file_status,
                "diff": diff_lines,
                "additions": additions,
                "deletions": deletions
            })

        pr.precomputed_diff = diff_response
        pr.diff_status = "COMPLETED"
        pr.save()
        
        execution_time = time.time() - start_time
        logger.info(f"Diff computation for PR {pr_id} safely completed. Processed {len(diff_response)} files in {execution_time:.3f} seconds.")

    except Exception as e:
        logger.error(f"Error computing diff for PR {pr_id}: {e}")
        PullRequest.objects.filter(id=pr_id).update(diff_status="FAILED")
        raise e

def trigger_diff_generation(pr_id, countdown=5):
    """
    Helper function to enqueue the diff generation task and set the cache lock for debouncing.
    """
    task = store_diff.apply_async(args=[pr_id], countdown=countdown)
    cache.set(f"pr_{pr_id}_diff_task_id", task.id, timeout=60 * 10)  # Lock for 10 minutes max
