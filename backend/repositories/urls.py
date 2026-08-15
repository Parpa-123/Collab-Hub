from django.urls import path
from .views import (
    RepositoryViewSet,
    RepositoryDetailView,
    OptionAPIView,
    RepositoryTree,
    FileContent,
    CommitDiffView,
    PublicRepositoryViewSet,
    DownloadRepositoryZipView,
    DownloadFileView
)

app_name = 'repositories'

urlpatterns = [
    path('public/', PublicRepositoryViewSet.as_view({'get': 'list'}), name='public-repository-list'),
    path('options/', OptionAPIView.as_view(), name='options'),
    path('', RepositoryViewSet.as_view({'get': 'list', 'post': 'create'}), name='repository-list'),
    path('<slug:slug>/', RepositoryDetailView.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='repository-detail'),
    path('<slug:slug>/members/', RepositoryDetailView.as_view({'get': 'list_members'}), name='repository-members'),
    path('<slug:slug>/search-users/', RepositoryDetailView.as_view({'get': 'search_users'}), name='repository-search-users'),
    path('<slug:slug>/add-member/', RepositoryDetailView.as_view({'post': 'add_member'}), name='repository-add-member'),
    path('<slug:slug>/remove-member/', RepositoryDetailView.as_view({'delete': 'remove_member'}), name='repository-remove-member'),
    path('<slug:slug>/members/<int:member_id>/role/', RepositoryDetailView.as_view({'patch': 'update_role'}), name='repository-update-role'),
    path('<slug:slug>/my-role/', RepositoryDetailView.as_view({'get': 'my_role'}), name='repository-my-role'),
    path('<slug:slug>/readme/', RepositoryDetailView.as_view({'get': 'readme'}), name='repository-readme'),
    path('<slug:slug>/tree/', RepositoryTree.as_view(), name='repository-tree'),
    path('<slug:slug>/code-review/', RepositoryDetailView.as_view({'get': 'code_review'}), name='repository-code-review'),
    path('<slug:slug>/file-upload/', RepositoryDetailView.as_view({'post': 'file_upload'}), name='repository-file-upload'),
    path('<slug:slug>/async-file-upload/', RepositoryDetailView.as_view({'post': 'async_file_upload'}), name='repository-async-file-upload'),
    path('<slug:slug>/upload-status/<str:task_id>/', RepositoryDetailView.as_view({'get': 'upload_status'}), name='repository-upload-status'),
    path('<slug:slug>/file-content/', FileContent.as_view(), name='repository-file-content'),
    path('<slug:slug>/download-zip/', DownloadRepositoryZipView.as_view(), name='download-zip'),
    path('<slug:slug>/download-file/', DownloadFileView.as_view(), name='download-file'),
    path('<slug:slug>/commit-diff/', CommitDiffView.as_view(), name='repository-commit-diff'),
    path('<slug:slug>/missing-objects/', RepositoryDetailView.as_view({'post': 'missing_objects'}), name='repository-missing-objects'),
    path('<slug:slug>/push/', RepositoryDetailView.as_view({'post': 'push'}), name='repository-push'),
    path('<slug:slug>/commits/', RepositoryDetailView.as_view({'get': 'commits'}), name='repository-commits'),
]