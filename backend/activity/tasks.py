from celery import shared_task
from .models import Activity
from repositories.models import Repository
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
User = get_user_model()

@shared_task
def log_activity(actor_id, content_type_id, object_id, repo_id, verb):
    actor = User.objects.get(id=actor_id)
    repo = Repository.objects.get(id=repo_id)
    content_type = ContentType.objects.get(id=content_type_id)
    
    Activity.objects.create(
        actor=actor,
        content_type=content_type,
        object_id=object_id,
        repo=repo,
        verb=verb,
    )