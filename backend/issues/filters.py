from django_filters import rest_framework as filters
from .models import Issue

class IssueFilter(filters.FilterSet):
    title = filters.CharFilter(lookup_expr='icontains')
    status = filters.CharFilter(lookup_expr='iexact')

    class Meta:
        model = Issue
        fields = ['title', 'status']