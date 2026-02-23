from django.urls import path
from .views import RepositoryViewSet, RepositoryDetailView, OptionAPIView

app_name = 'repositories'

urlpatterns = [
    path('options/', OptionAPIView.as_view(), name='options'),
    path('', RepositoryViewSet.as_view({'get': 'list', 'post': 'create'}), name='repository-list'),
    path('<slug:slug>/', RepositoryDetailView.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='repository-detail'),
    path('<slug:slug>/members/', RepositoryDetailView.as_view({'get': 'list_members'}), name='repository-members'),
    path('<slug:slug>/search-users/', RepositoryDetailView.as_view({'get': 'search_users'}), name='repository-search-users'),
    path('<slug:slug>/add-member/', RepositoryDetailView.as_view({'post': 'add_member'}), name='repository-add-member'),
    path('<slug:slug>/remove-member/', RepositoryDetailView.as_view({'delete': 'remove_member'}), name='repository-remove-member'),
    path('<slug:slug>/members/<int:member_id>/role/', RepositoryDetailView.as_view({'patch': 'update_role'}), name='repository-update-role'),
    path('<slug:slug>/my-role/', RepositoryDetailView.as_view({'get': 'my_role'}), name='repository-my-role'),
]