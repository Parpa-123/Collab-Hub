from django.db import models
from common.models import CommonModel

# Create your models here.
class Branches(CommonModel):
    name = models.CharField(max_length=100)
    repository = models.ForeignKey('repositories.Repository', on_delete=models.CASCADE, related_name='branches')
    is_default = models.BooleanField(default=False)
    is_protected = models.BooleanField(default=False)
    created_by = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE)
    created_from = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.name} - {self.repository.name}"

    class Meta:
        verbose_name = 'Branch'
        verbose_name_plural = 'Branches'
        unique_together = ('name', 'repository')
