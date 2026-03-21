from rest_framework.pagination import PageNumberPagination

class ActivityPagination(PageNumberPagination):
    page_size = 10
    ordering = '-created_at'