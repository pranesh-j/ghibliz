# images/serializers.py
from rest_framework import serializers
from .models import GeneratedImage
from django.contrib.auth.models import User

class GeneratedImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()
    
    class Meta:
        model = GeneratedImage
        fields = ['id', 'image_url', 'preview_url', 'is_paid', 'created_at']
        read_only_fields = ['id', 'image_url', 'preview_url', 'is_paid', 'created_at']
    
    def get_image_url(self, obj):
        if obj.is_paid:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None
    
    def get_preview_url(self, obj):
        request = self.context.get('request')
        if request and obj.preview_image:
            return request.build_absolute_uri(obj.preview_image.url)
        return None

class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()