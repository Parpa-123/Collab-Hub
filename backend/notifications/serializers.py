from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    content_object = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'actor_name',
            'content_object',
            'content_type',
            'object_id',
            'is_read',
            'read_at',
            'created_at',
            'verb',    
        ]

    def get_actor_name(self, obj):
        if not obj.actor:
            return "Unknown User"
        full_name = obj.actor.get_full_name().strip()
        return full_name if full_name else obj.actor.email.split('@')[0]

    def get_content_object(self, obj):
        if obj.content_object:
            return {
                "id": getattr(obj.content_object, "id", None),
                "type": obj.content_object.__class__.__name__,
                "name": str(obj.content_object)
            }
        return None