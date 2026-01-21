from rest_framework import serializers
from .models import CustomUser
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomUserSerializer(serializers.ModelSerializer):

    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=CustomUser.objects.all())]
    )
    password = serializers.CharField(write_only=True)
    class Meta:
        model = CustomUser
        fields = ['email', 'first_name', 'last_name', 'password']

    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            **validated_data
        )
        return user
    
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters long')
        return value
    
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        user = CustomUser.objects.filter(email=email).first()
        if not user:
            raise serializers.ValidationError('User not found')
        if not user.check_password(password):
            raise serializers.ValidationError('Incorrect password')
        
        return super().validate(attrs)

class AutenticatedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['email', 'password', 'first_name', 'last_name']

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters long')
        return value