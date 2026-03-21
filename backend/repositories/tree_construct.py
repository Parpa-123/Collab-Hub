
def build_tree(snapshot):
    tree = {}
    for path, content in snapshot.items():
        parts = path.split("/")
        current_level = tree
        for part in parts[:-1]:
            current_level = current_level.setdefault(part, {})
        current_level[parts[-1]] = content
    return tree


def dict_to_tree(name,node):
    if node is None:
        return {
            "name": name,
            "type": "file",
        }
    
    return{
        "name" : name,
        "type" : "directory",
        "children" : [dict_to_tree(child_name, child_node) for child_name, child_node in sorted(node.items())]
    }


def build_structured_tree(snapshot):
    tree = build_tree(snapshot)
    return {
        "name" : "",
        "type" : "directory",
        "children" : [
            dict_to_tree(child_name, child_node) for child_name, child_node in sorted(tree.items())
        ]
    }
