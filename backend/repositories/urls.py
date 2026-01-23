from django.urls import path
from .views import RepositoryViewSet

app_name = 'repositories'

urlpatterns = [
    path('', RepositoryViewSet.as_view({'get': 'list', 'post': 'create'}), name='repository-list'),
]