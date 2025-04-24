from django.db import models
from django.contrib.auth.models import User
import uuid
import os


def get_image_path(instance, filename):
    """Generate a unique path for storing generated images"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('images', filename)


class GeneratedImage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=get_image_path)
    preview_image = models.ImageField(upload_to=get_image_path, null=True, blank=True)
    is_paid = models.BooleanField(default=False)
    download_token = models.UUIDField(default=uuid.uuid4, editable=False)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Image {self.id} by {self.user.username}"

    class Meta:
        verbose_name = 'Generated Image'
        verbose_name_plural = 'Generated Images'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        """Generate a new download token when saving if it doesn't exist"""
        if not self.download_token:
            self.download_token = uuid.uuid4()
        super().save(*args, **kwargs)

    @property
    def token_is_valid(self):
        """Check if the download token is still valid"""
        if not self.token_expires_at:
            return False
        from django.utils import timezone
        return timezone.now() <= self.token_expires_at

    def get_image_url(self):
        """
        Force the correct public URL format for images
        """
        from decouple import config
        
        if not self.image:
            return None
            
        # Get the project ID 
        project_id = config('SUPABASE_PROJECT_ID')
        
        # Extract just the filename part
        path = self.image.name
        
        # Return properly formatted URL
        return f"https://{project_id}.supabase.co/storage/v1/object/public/ghiblits/{path}"


class StylePrompt(models.Model):
    style_key = models.CharField(max_length=50, unique=True)
    prompt = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Style: {self.style_key}"
        
    class Meta:
        verbose_name = 'Style Prompt'
        verbose_name_plural = 'Style Prompts'