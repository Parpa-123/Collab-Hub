import hashlib
from storage.models import Blob

def get_content_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()

def get_or_create_blob(content : str, is_binary: bool = False) -> Blob:
    content_hash = get_content_hash(content)
    blob, created = Blob.objects.get_or_create(content_hash=content_hash, defaults={"content": content, "is_binary": is_binary})
    return blob

def bulk_get_or_create_blobs(file_data_list: list) -> dict:
    """
    file_data_list format: [{'path': '...', 'content': '...', 'is_binary': bool}]
    Returns: { 'path': 'blob_id_string' }
    """
    if not file_data_list:
        return {}
        
    blobs_to_create = []
    path_to_hash = {}
    
    for file_data in file_data_list:
        content = file_data['content']
        path = file_data['path']
        is_binary = file_data.get('is_binary', False)
        
        content_hash = get_content_hash(content)
        path_to_hash[path] = content_hash
        
        blobs_to_create.append(Blob(
            content=content,
            content_hash=content_hash,
            is_binary=is_binary
        ))
        
    batch_size = 500
    for i in range(0, len(blobs_to_create), batch_size):
        Blob.objects.bulk_create(blobs_to_create[i:i + batch_size], ignore_conflicts=True)
    
    all_hashes = list(set(path_to_hash.values()))
    hash_to_id = {}
    
    for i in range(0, len(all_hashes), batch_size):
        batch_hashes = all_hashes[i:i + batch_size]
        blobs = Blob.objects.filter(content_hash__in=batch_hashes)
        for blob in blobs:
            hash_to_id[blob.content_hash] = str(blob.id)
    
    path_to_blob_id = {}
    for path, content_hash in path_to_hash.items():
        path_to_blob_id[path] = hash_to_id.get(content_hash)
        
    return path_to_blob_id

def get_missing_blob_hashes(hash_list: list) -> list:
    """
    Given a list of SHA256 hashes, returns the subset that are NOT 
    currently stored in the database.
    """
    if not hash_list:
        return []
    
    # Fetch all content_hashes that actually exist in the DB from the given list
    existing = set(Blob.objects.filter(content_hash__in=hash_list).values_list("content_hash", flat=True))
    
    # Determine the missing subset
    missing = [h for h in hash_list if h not in existing]
    return missing