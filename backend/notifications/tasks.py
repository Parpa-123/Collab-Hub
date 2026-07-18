from celery import shared_task
from django.contrib.contenttypes.models import ContentType
import logging
from .models import Notification
from PullRequest.models import PullRequest, Review
from issues.models import Issue
from repositories.models import RepositoryMember
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def _dedupe_key(event, *parts):
    return ":".join([event, *(str(part) for part in parts)])

def _create_or_update_notification_and_broadcast(recipient, actor, content_type, object_id, verb, dedupe_key):
    notification, created = Notification.objects.get_or_create(
        dedupe_key=dedupe_key,
        defaults={
            "recipient": recipient,
            "actor": actor,
            "content_type": content_type,
            "object_id": object_id,
            "verb": verb,
        }
    )
    if not created:
        notification.is_read = False
        notification.actor = actor
        notification.verb = verb
        notification.save(update_fields=['is_read', 'actor', 'verb', 'updated_at'])
    
    # Broadcast to WebSocket
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{recipient.id}_notifications",
        {"type": "notification.new"}
    )

@shared_task(bind=True, max_retries=3)
def notify_pr_created(self, pr_id):
    
    try:
        pr = PullRequest.objects.select_related('repo', 'created_by').get(id=pr_id)
        members = RepositoryMember.objects.select_related("developer").filter(repository=pr.repo).exclude(developer=pr.created_by)
        content_type = ContentType.objects.get_for_model(pr)
        for member in members:
            _create_or_update_notification_and_broadcast(
                recipient=member.developer,
                actor=pr.created_by,
                content_type=content_type,
                object_id=pr.id,
                verb="created a pull request",
                dedupe_key=_dedupe_key("pr_created", pr.id, member.developer_id),
            )
    
    except PullRequest.DoesNotExist as exc:
        self.retry(exc=exc, countdown=5)
        return

@shared_task(bind=True, max_retries=3)
def notify_pr_commented(self, review_id):
    try:
        review = Review.objects.select_related('pr__repo', 'pr__created_by', 'reviewer').get(id=review_id)
        pr = review.pr
        members = RepositoryMember.objects.select_related("developer").filter(repository=pr.repo)
        content_type = ContentType.objects.get_for_model(pr)
        
        recipients = {member.developer for member in members}
        recipients.add(pr.created_by)
        recipients.discard(review.reviewer)
        
        for user in recipients:
            verb = "commented on your pull request" if user == pr.created_by else "commented on pull request"
            _create_or_update_notification_and_broadcast(
                recipient=user,
                actor=review.reviewer,
                content_type=content_type,
                object_id=pr.id,
                verb=verb,
                dedupe_key=_dedupe_key("pr_commented", pr.id, user.id),
            )
    except Review.DoesNotExist as exc:
        self.retry(exc=exc, countdown=5)
        return

@shared_task(bind=True, max_retries=3)
def notify_pr_reviewed(self, review_id):
    try:
        review = Review.objects.select_related('pr__repo', 'pr__created_by', 'reviewer').get(id=review_id)
        pr = review.pr
        members = RepositoryMember.objects.select_related("developer").filter(repository=pr.repo)
        content_type = ContentType.objects.get_for_model(pr)
        
        recipients = {member.developer for member in members}
        recipients.add(pr.created_by)
        recipients.discard(review.reviewer)
        
        for user in recipients:
            verb = f"{review.get_status_display().lower()} your pull request" if user == pr.created_by else f"{review.get_status_display().lower()} pull request"
            _create_or_update_notification_and_broadcast(
                recipient=user,
                actor=review.reviewer,
                content_type=content_type,
                object_id=pr.id,
                verb=verb,
                dedupe_key=_dedupe_key("pr_reviewed", pr.id, user.id),
            )
    except Review.DoesNotExist as exc:
        self.retry(exc=exc, countdown=5)
        return

@shared_task(bind=True, max_retries=3)
def notify_issue_created(self, issue_id):
    try:
        issue = Issue.objects.select_related('repo', 'creator').get(id=issue_id)
        members = RepositoryMember.objects.select_related("developer").filter(repository=issue.repo).exclude(developer=issue.creator)
        content_type = ContentType.objects.get_for_model(issue)
        for member in members:
            _create_or_update_notification_and_broadcast(
                recipient=member.developer,
                actor=issue.creator,
                content_type=content_type,
                object_id=issue.id,
                verb="opened an issue",
                dedupe_key=_dedupe_key("issue_created", issue.id, member.developer_id),
            )
    except Issue.DoesNotExist as exc:
        self.retry(exc=exc, countdown=5)
        return

@shared_task(bind=True, max_retries=3)
def notify_issue_assigned(self, issue_id, assignee_id, actor_id, issue_assignee_id=None):
    try:
        issue = Issue.objects.get(id=issue_id)
        assignee = User.objects.get(id=assignee_id)
        actor = User.objects.get(id=actor_id)
        content_type = ContentType.objects.get_for_model(issue)
        
        if assignee != actor:
            dedupe_key = _dedupe_key(
                "issue_assigned",
                issue_assignee_id if issue_assignee_id is not None else f"{issue.id}-{assignee.id}-{actor.id}",
                assignee.id,
            )
            _create_or_update_notification_and_broadcast(
                recipient=assignee,
                actor=actor,
                content_type=content_type,
                object_id=issue.id,
                verb="assigned you to an issue",
                dedupe_key=dedupe_key,
            )
    except (Issue.DoesNotExist, Exception) as exc:
        self.retry(exc=exc, countdown=5)
        return


@shared_task(bind=True, max_retries=3)
def notify_pr_reopened(self, pr_id):
    try:
        pr = PullRequest.objects.select_related('repo', 'created_by').get(id=pr_id)
        members = RepositoryMember.objects.select_related("developer").filter(repository=pr.repo).exclude(developer=pr.created_by)
        content_type = ContentType.objects.get_for_model(pr)
        for member in members:
            _create_or_update_notification_and_broadcast(
                recipient=member.developer,
                actor=pr.created_by,
                content_type=content_type,
                object_id=pr.id,
                verb="reopened a pull request",
                dedupe_key=_dedupe_key("pr_reopened", pr.id, member.developer_id),
            )

    except PullRequest.DoesNotExist as exc:
        self.retry(exc=exc, countdown=5)
        return

@shared_task(bind=True, max_retries=3)
def notify_generic_comment(self, comment_id):
    try:
        from comments.models import Comment
        comment = Comment.objects.select_related('author').get(id=comment_id)
        content_object = comment.content_object
        
        # We only really care about PullRequests and Issues for general commenting
        if not content_object.__class__.__name__ in ['PullRequest', 'Issue']:
            return
            
        repo = getattr(content_object, 'repo', None) or getattr(content_object, 'repository', None)
        if not repo: return
            
        recipients = set()
        
        # 1. Author of the PR/Issue
        creator = getattr(content_object, 'created_by', None) or getattr(content_object, 'creator', None)
        if creator:
            recipients.add(creator)
            
        # 2. Assignees (if Issue)
        issue_assignees = getattr(content_object, 'issue_assignees', None)
        if issue_assignees is not None:
            for assignment in issue_assignees.select_related('assignee'):
                if assignment.assignee:
                    recipients.add(assignment.assignee)
             
        # 3. People who previously commented on this PullRequest/Issue!
        previous_comments = Comment.objects.filter(
            content_type=comment.content_type, 
            object_id=comment.object_id
        ).select_related('author')
        for pc in previous_comments:
             if pc.author:
                 recipients.add(pc.author)
            
        # 4. Add Repository Members generally if you want them all to see thread 
        # (mirroring existing logic)
        from repositories.models import RepositoryMember
        members = RepositoryMember.objects.select_related("developer").filter(repository=repo)
        for member in members:
            recipients.add(member.developer)
            
        # Exclude the commenter themselves
        recipients.discard(comment.author)
        
        for user in recipients:
            verb = f"commented on the {content_object.__class__.__name__}"
            if user == creator:
                 verb = f"commented on your {content_object.__class__.__name__}"
            
            # Group by object id, not comment id, so 1 PR = 1 notification
            dedupe_key = _dedupe_key("comment_created", comment.object_id, user.id)
            
            _create_or_update_notification_and_broadcast(
                recipient=user,
                actor=comment.author,
                content_type=comment.content_type,
                object_id=comment.object_id,
                verb=verb,
                dedupe_key=dedupe_key,
            )

    except Exception as exc:
        logger.exception("Failed to create comment notifications for comment %s", comment_id)
        self.retry(exc=exc, countdown=5)
        return

@shared_task(bind=True, max_retries=3)
def notify_pr_merged(self, pr_id, actor_id):
    try:
        pr = PullRequest.objects.select_related('repo', 'created_by').get(id=pr_id)
        actor = User.objects.get(id=actor_id)
        members = RepositoryMember.objects.select_related("developer").filter(repository=pr.repo)
        content_type = ContentType.objects.get_for_model(pr)
        
        recipients = {member.developer for member in members}
        recipients.add(pr.created_by)
        recipients.discard(actor)
        
        for user in recipients:
            verb = "merged your pull request" if user == pr.created_by else "merged a pull request"
            _create_or_update_notification_and_broadcast(
                recipient=user,
                actor=actor,
                content_type=content_type,
                object_id=pr.id,
                verb=verb,
                dedupe_key=_dedupe_key("pr_merged", pr.id, user.id),
            )
    except Exception as exc:
        self.retry(exc=exc, countdown=5)
        return

@shared_task(bind=True, max_retries=3)
def notify_pr_closed(self, pr_id, actor_id):
    try:
        pr = PullRequest.objects.select_related('repo', 'created_by').get(id=pr_id)
        actor = User.objects.get(id=actor_id)
        members = RepositoryMember.objects.select_related("developer").filter(repository=pr.repo)
        content_type = ContentType.objects.get_for_model(pr)
        
        recipients = {member.developer for member in members}
        recipients.add(pr.created_by)
        recipients.discard(actor)
        
        for user in recipients:
            verb = "closed your pull request" if user == pr.created_by else "closed a pull request"
            _create_or_update_notification_and_broadcast(
                recipient=user,
                actor=actor,
                content_type=content_type,
                object_id=pr.id,
                verb=verb,
                dedupe_key=_dedupe_key("pr_closed", pr.id, user.id),
            )
    except Exception as exc:
        self.retry(exc=exc, countdown=5)
        return

@shared_task(bind=True, max_retries=3)
def notify_issue_closed(self, issue_id, actor_id):
    try:
        issue = Issue.objects.select_related('repo', 'creator').get(id=issue_id)
        actor = User.objects.get(id=actor_id)
        members = RepositoryMember.objects.select_related("developer").filter(repository=issue.repo)
        content_type = ContentType.objects.get_for_model(issue)
        
        recipients = {member.developer for member in members}
        recipients.add(issue.creator)
        recipients.discard(actor)
        
        for user in recipients:
            verb = "closed your issue" if user == issue.creator else "closed an issue"
            _create_or_update_notification_and_broadcast(
                recipient=user,
                actor=actor,
                content_type=content_type,
                object_id=issue.id,
                verb=verb,
                dedupe_key=_dedupe_key("issue_closed", issue.id, user.id),
            )
    except Exception as exc:
        self.retry(exc=exc, countdown=5)
        return

@shared_task(bind=True, max_retries=3)
def notify_repo_member_added(self, repo_id, member_id, actor_id):
    try:
        from repositories.models import Repository
        repo = Repository.objects.get(id=repo_id)
        member = User.objects.get(id=member_id)
        actor = User.objects.get(id=actor_id)
        content_type = ContentType.objects.get_for_model(repo)
        
        if member != actor:
            _create_or_update_notification_and_broadcast(
                recipient=member,
                actor=actor,
                content_type=content_type,
                object_id=repo.id,
                verb="added you as a collaborator",
                dedupe_key=_dedupe_key("repo_member_added", repo.id, member.id),
            )
    except Exception as exc:
        self.retry(exc=exc, countdown=5)
        return
