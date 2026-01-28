from django.urls import path
from .views import RepositoryViewSet, RepositoryDetailView, OptionAPIView

app_name = 'repositories'

urlpatterns = [
    path('options/', OptionAPIView.as_view(), name='options'),
    path('', RepositoryViewSet.as_view({'get': 'list', 'post': 'create'}), name='repository-list'),
    path('<slug:slug>/', RepositoryDetailView.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='repository-detail'),
]