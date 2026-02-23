from django.contrib import admin
from .models import Branches, Commit


@admin.register(Branches)
class BranchesAdmin(admin.ModelAdmin):
    list_display = ('name', 'repository', 'is_default', 'is_protected')
    list_filter = ('is_default', 'is_protected')


@admin.register(Commit)
class CommitAdmin(admin.ModelAdmin):
    list_display = ('id', 'message', 'branch', 'author', 'created_at')
    list_filter = ('branch', 'author')
    search_fields = ('message',)
