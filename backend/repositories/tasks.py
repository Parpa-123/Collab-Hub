from celery import shared_task
from django.db import transaction
from repositories.models import Repository
from branches.models import Branches, Commit
from storage.services.blob_service import bulk_get_or_create_blobs
from storage.services.tree_services import build_tree_from_snapshots
from django.contrib.auth import get_user_model

User = get_user_model()

@shared_task
def process_async_upload(repository_id, branch_name, message, user_id, file_data_list):
    try:
        repository = Repository.objects.get(id=repository_id)
        user = User.objects.get(id=user_id)
        branch = Branches.objects.filter(repository=repository, name=branch_name).first()
        
        if not branch:
            return {"status": "error", "message": "Branch not found"}
            
        parent_commit = branch.head_commit
        snapshot = parent_commit.snapshot.copy() if parent_commit and parent_commit.snapshot else {}
        
        path_to_blob_id = bulk_get_or_create_blobs(file_data_list)
        for path, blob_id in path_to_blob_id.items():
            snapshot[path] = blob_id
            
        with transaction.atomic():
            new_commit = Commit.objects.create(
                repository=repository,
                branch=branch,
                parent=parent_commit,
                message=message,
                author=user,
                snapshot=snapshot
            )
            
            build_tree_from_snapshots(new_commit, snapshot)
            
            branch.head_commit = new_commit
            branch.save()
            
        return {"status": "success", "message": "Files uploaded and committed successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
