from django.test import TestCase
from django.db import connection, models
from common.models import CommonModel

class TestCommonModel(CommonModel):
    name = models.CharField(max_length=50)

    class Meta:
        app_label = 'common'

class CommonModelTest(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with connection.schema_editor() as schema_editor:
            schema_editor.create_model(TestCommonModel)

    @classmethod
    def tearDownClass(cls):
        with connection.schema_editor() as schema_editor:
            schema_editor.delete_model(TestCommonModel)
        super().tearDownClass()

    def test_timestamps_auto_set(self):
        obj = TestCommonModel.objects.create(name="test")
        self.assertIsNotNone(obj.created_at)
        self.assertIsNotNone(obj.updated_at)
        
        old_updated_at = obj.updated_at
        obj.name = "updated"
        obj.save()
        
        obj.refresh_from_db()
        self.assertGreaterEqual(obj.updated_at, old_updated_at)
