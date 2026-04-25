from django.contrib.postgres.indexes import GinIndex
from django.db import migrations


def create_trigram_index(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    schema_editor.execute(
        'CREATE INDEX IF NOT EXISTS "repo_user_trgm_idx" '
        'ON "accounts_customuser" '
        'USING gin ("email" gin_trgm_ops, "first_name" gin_trgm_ops, "last_name" gin_trgm_ops)'
    )


def drop_trigram_index(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    schema_editor.execute('DROP INDEX IF EXISTS "repo_user_trgm_idx"')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_customuser_accounts_cu_email_5ce40b_idx_and_more'),
        ('repositories', '0004_enable_pg_trgm'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(create_trigram_index, drop_trigram_index),
            ],
            state_operations=[
                migrations.AddIndex(
                    model_name='customuser',
                    index=GinIndex(
                        fields=['email', 'first_name', 'last_name'],
                        name='repo_user_trgm_idx',
                        opclasses=['gin_trgm_ops', 'gin_trgm_ops', 'gin_trgm_ops'],
                    ),
                ),
            ],
        ),
    ]
