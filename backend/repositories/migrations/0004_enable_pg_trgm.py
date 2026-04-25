from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('repositories', '0003_auto_20260329_2258'),
    ]

    operations = [
        TrigramExtension(),
    ]
