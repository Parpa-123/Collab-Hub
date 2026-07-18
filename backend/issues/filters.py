from django_filters import rest_framework as filters
from .models import Issue


class CharInFilter(filters.BaseInFilter, filters.CharFilter):
    pass


class IssueFilter(filters.FilterSet):
    title = filters.CharFilter(field_name="title", lookup_expr="icontains")
    status = CharInFilter(field_name="status", lookup_expr="iexact")
    assignee = filters.NumberFilter(field_name="issue_assignees__assignee_id")
    label = filters.NumberFilter(field_name="labels__id")

    class Meta:
        model = Issue
        fields = ["title", "status", "assignee", "label"]
