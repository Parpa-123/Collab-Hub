from storage.models import Tree, TreeNode, Blob
from storage.services.blob_service import get_or_create_blob
from django.db import transaction

@transaction.atomic
def build_tree_from_snapshots(commit, snapshot:dict):
    tree = Tree.objects.create(commit=commit)
    created_dirs = {}

    for path, content in snapshot.items():
        parts = path.split('/')
        current_parent = None
        current_path = ""

        for i in range(len(parts)-1):
            part = parts[i]
            current_path = f"{current_path}/{part}" if current_path else part

            if current_path not in created_dirs:
                dir_node = TreeNode.objects.create(
                    tree=tree,
                    name=part,
                    path=current_path,
                    type='dir',
                    parent=current_parent
                )
                created_dirs[current_path] = dir_node
            else:
                dir_node = created_dirs[current_path]
            
            current_parent = dir_node
        
        file_name = parts[-1]
        file_path = f"{current_path}/{file_name}" if current_path else file_name

        blob = get_or_create_blob(content=content)
        TreeNode.objects.create(
            tree=tree,
            name=file_name,
            path=file_path,
            type='file',
            parent=current_parent,
            blob=blob
        )
    
    return tree