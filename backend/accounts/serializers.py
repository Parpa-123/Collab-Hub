from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomUserSerializer(serializers.ModelSerializer):

    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=CustomUser.objects.all())]
    )
    password = serializers.CharField(write_only=True)
    class Meta:
        model = CustomUser
        fields = ['email', 'first_name', 'last_name', 'password', 'bio']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser.objects.create_user(password=password, **validated_data)
        return user
    
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters long')
        return value

    def validate_bio(self, value):
        if len(value) > 500:
            raise serializers.ValidationError('Bio must be at most 500 characters long')
        return value

    def update_password(self, instance, validated_data):
        instance.set_password(validated_data['password'])
        instance.save()
        return instance
    
    
    
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
        fields = ['pk','email', 'first_name', 'last_name', 'bio']
        read_only_fields = ['pk']