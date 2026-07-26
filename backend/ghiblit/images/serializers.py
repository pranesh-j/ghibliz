# images/serializers.py
from rest_framework import serializers
from .models import GeneratedImage
from django.contrib.auth.models import User

class GeneratedImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()  # Add download URL
    
    class Meta:
        model = GeneratedImage
        fields = ['id', 'image_url', 'preview_url', 'download_url', 'is_paid', 'created_at']
        read_only_fields = ['id', 'image_url', 'preview_url', 'download_url', 'is_paid', 'created_at']
    
    def get_image_url(self, obj):
        if obj.is_paid and obj.image:
            request = self.context.get('request')
            if request:
                # Use our clean image proxy for viewing
                return request.build_absolute_uri(f'/api/clean-image/{obj.image.name}')
        return None
    
    def get_preview_url(self, obj):
        if obj.preview_image:
            request = self.context.get('request')
            if request:
                # Use our clean image proxy for previews
                return request.build_absolute_uri(f'/api/clean-image/{obj.preview_image.name}')
        return None
        
    def get_download_url(self, obj):
        """
        Generate a download URL with the token for direct downloads
        """
        if obj.is_paid and obj.image:
            request = self.context.get('request')
            if request and obj.download_token:
                # Use the download endpoint that serves as attachment
                return request.build_absolute_uri(f'/api/images/download/{obj.id}/?token={obj.download_token}')
        return None

class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()