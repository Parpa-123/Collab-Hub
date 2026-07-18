import uuid
from storage.models import Tree, TreeNode, Blob
from django.db import transaction

@transaction.atomic
def build_tree_from_snapshots(commit, snapshot:dict):
    tree = Tree.objects.create(commit=commit)
    created_dirs = {}
    nodes_to_create = []

    for path, blob_id in snapshot.items():
        parts = path.split('/')
        current_parent = None
        current_path = ""

        for i in range(len(parts)-1):
            part = parts[i]
            current_path = f"{current_path}/{part}" if current_path else part

            if current_path not in created_dirs:
                dir_node = TreeNode(
                    id=uuid.uuid4(),
                    tree=tree,
                    name=part,
                    path=current_path,
                    type='dir',
                    parent=current_parent
                )
                created_dirs[current_path] = dir_node
                nodes_to_create.append(dir_node)
            else:
                dir_node = created_dirs[current_path]
            
            current_parent = dir_node
        
        file_name = parts[-1]
        file_path = f"{current_path}/{file_name}" if current_path else file_name

        file_node = TreeNode(
            id=uuid.uuid4(),
            tree=tree,
            name=file_name,
            path=file_path,
            type='file',
            parent=current_parent,
            blob_id=blob_id
        )
        nodes_to_create.append(file_node)
    
    batch_size = 500
    for i in range(0, len(nodes_to_create), batch_size):
        TreeNode.objects.bulk_create(nodes_to_create[i:i + batch_size])
    
    return tree