from celery import shared_task
from django.contrib.contenttypes.models import ContentType
from .models import Notification
from PullRequest.models import PullRequest, Review
from issues.models import Issue
from repositories.models import RepositoryMember

@shared_task(bind=True, max_retries=3)
def notify_pr_created(self, pr_id):
    
    try:
        pr = PullRequest.objects.select_related('repo', 'created_by').get(id=pr_id)
        members = RepositoryMember.objects.select_related("developer").filter(repository=pr.repo).exclude(developer=pr.created_by)
        content_type = ContentType.objects.get_for_model(pr)
        notifications = []
        for member in members:
            notifications.append(
                Notification(
                    recipient=member.developer,
                    actor=pr.created_by,
                    content_type=content_type,
                    object_id=pr.id,
                    verb="created a pull request",
                )
            )
        Notification.objects.bulk_create(notifications)
    
    except PullRequest.DoesNotExist:
        self.retry(exc=PullRequest.DoesNotExist, countdown=5)
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
        
        notifications = []
        for user in recipients:
            verb = "commented on your pull request" if user == pr.created_by else "commented on pull request"
            notifications.append(
                Notification(
                    recipient=user,
                    actor=review.reviewer,
                    content_type=content_type,
                    object_id=pr.id,
                    verb=verb,
                )
            )
        Notification.objects.bulk_create(notifications)
    except Review.DoesNotExist:
        self.retry(exc=Review.DoesNotExist, countdown=5)
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
        
        notifications = []
        for user in recipients:
            verb = f"{review.get_status_display().lower()} your pull request" if user == pr.created_by else f"{review.get_status_display().lower()} pull request"
            notifications.append(
                Notification(
                    recipient=user,
                    actor=review.reviewer,
                    content_type=content_type,
                    object_id=pr.id,
                    verb=verb,
                )
            )
        Notification.objects.bulk_create(notifications)
    except Review.DoesNotExist:
        self.retry(exc=Review.DoesNotExist, countdown=5)
        return

@shared_task(bind=True, max_retries=3)
def notify_issue_created(self, issue_id):
    try:
        issue = Issue.objects.select_related('repo', 'creator').get(id=issue_id)
        members = RepositoryMember.objects.select_related("developer").filter(repository=issue.repo).exclude(developer=issue.creator)
        content_type = ContentType.objects.get_for_model(issue)
        notifications = [
            Notification(
                recipient=member.developer,
                actor=issue.creator,
                content_type=content_type,
                object_id=issue.id,
                verb="opened an issue",
            )
            for member in members
        ]
        Notification.objects.bulk_create(notifications)
    except Issue.DoesNotExist:
        self.retry(exc=Issue.DoesNotExist, countdown=5)
        return

@shared_task(bind=True, max_retries=3)
def notify_issue_assigned(self, issue_id, assignee_id, actor_id):
    try:
        issue = Issue.objects.get(id=issue_id)
        from django.contrib.auth import get_user_model
        user_model = get_user_model()
        assignee = user_model.objects.get(id=assignee_id)
        actor = user_model.objects.get(id=actor_id)
        content_type = ContentType.objects.get_for_model(issue)
        
        if assignee != actor:
            Notification.objects.create(
                recipient=assignee,
                actor=actor,
                content_type=content_type,
                object_id=issue.id,
                verb="assigned you to an issue",
            )
    except (Issue.DoesNotExist, Exception) as exc:
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
        if hasattr(content_object, 'assignee') and content_object.assignee:
             recipients.add(content_object.assignee)
             
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
        
        notifications = []
        for user in recipients:
            verb = f"commented on the {content_object.__class__.__name__}"
            if user == creator:
                 verb = f"commented on your {content_object.__class__.__name__}"
            
            notifications.append(
                Notification(
                    recipient=user,
                    actor=comment.author,
                    content_type=comment.content_type,
                    object_id=comment.object_id,
                    verb=verb,
                )
            )
        if notifications:
            Notification.objects.bulk_create(notifications)
    except Exception as exc:
        self.retry(exc=exc, countdown=5)
        return