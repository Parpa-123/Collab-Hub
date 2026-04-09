import hashlib
from storage.models import Blob

def get_content_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()

def get_or_create_blob(content : str) -> Blob:
    content_hash = get_content_hash(content)
    blob, created = Blob.objects.get_or_create(content_hash=content_hash, defaults={"content": content})
    return blob