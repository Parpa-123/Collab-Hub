from rest_framework import serializers
from .models import Activity


class ActivitySerializer(serializers.ModelSerializer):
    actor = serializers.PrimaryKeyRelatedField(read_only=True)
    
    message = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = ['id','actor','message']
    
    def get_message(self, obj):
        return f"{obj.actor} {obj.verb} {obj.content_object}"
        
