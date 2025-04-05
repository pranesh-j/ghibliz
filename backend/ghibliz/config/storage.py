# config/storage.py
import mimetypes
import boto3
import re
from botocore.client import Config
from django.conf import settings
from decouple import config
from storages.backends.s3boto3 import S3Boto3Storage
from django.core.files.base import ContentFile
from io import BytesIO
from PIL import Image
import requests
import logging

logger = logging.getLogger(__name__)

class GeneratedImagesStorage(S3Boto3Storage):
    bucket_name = 'ghiblits'
    file_overwrite = False
    default_acl = 'public-read'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Create direct client for specialized operations
        self.client = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
        )
    
    def _save(self, name, content):
        """
        Override the _save method to handle direct upload with proper metadata
        """
        try:
            # Read image data
            content.seek(0)
            img_data = content.read()
            content.seek(0)
            
            # Try to validate that it's a proper image
            img = Image.open(BytesIO(img_data))
            
            # Get the content type based on the image format
            content_type = f"image/{img.format.lower()}" if img.format else 'image/jpeg'
            
            # Upload directly using boto3
            self.client.upload_fileobj(
                content,
                self.bucket_name,
                name,
                ExtraArgs={
                    'ContentType': content_type,
                    'ACL': 'public-read'
                }
            )
            
            # Return the name for Django's record
            return name
        except Exception as e:
            logger.error(f"Error saving image to Supabase: {str(e)}")
            # Fall back to standard save if direct upload fails
            return super()._save(name, content)
    
    def url(self, name):
        """
        Generate the correct public URL format for Supabase
        """
        project_id = config('SUPABASE_PROJECT_ID')
        
        # Ensure the path doesn't have a leading slash
        name = name.lstrip('/')
        
        # Public URL format
        return f"https://{project_id}.supabase.co/storage/v1/object/public/{self.bucket_name}/{name}"
        
    def _open(self, name, mode='rb'):
        """
        Override open method to clean up image data downloaded from Supabase
        """
        name = self._normalize_name(self._clean_name(name))
        
        # Instead of using S3 API, use HTTP to get the file through the public URL
        # This avoids the metadata corruption issue
        url = self.url(name)
        
        try:
            # Get file directly through HTTP request
            response = requests.get(url)
            if response.status_code != 200:
                # If public URL fails, fall back to S3 API but clean the content
                file_content = super()._open(name, mode).read()
                file_content = self._clean_supabase_content(file_content)
            else:
                # Use the clean HTTP response content
                file_content = response.content
                
            # Return as ContentFile
            return ContentFile(file_content)
        except Exception as e:
            logger.error(f"Error reading file from Supabase: {str(e)}")
            # Fall back to original but try to clean content
            file_obj = super()._open(name, mode)
            file_content = file_obj.read()
            clean_content = self._clean_supabase_content(file_content)
            return ContentFile(clean_content)
    
    def _clean_supabase_content(self, content):
        """
        Clean Supabase's extra metadata from file content
        """
        if not content:
            return content
            
        # Check if content has image signature or starts with content length
        if content.startswith(b'\x89PNG') or content.startswith(b'\xff\xd8\xff'):
            # Already clean
            return content
            
        # Try to find the image signature in the content
        png_pos = content.find(b'\x89PNG\r\n\x1a\n')
        jpeg_pos = content.find(b'\xff\xd8\xff')
        
        # If found, strip everything before it
        if png_pos > 0:
            return content[png_pos:]
        if jpeg_pos > 0:
            return content[jpeg_pos:]
            
        # Try to strip the content-length and other headers
        # Common pattern: digits followed by \r\n
        match = re.search(b'\r\n\r\n', content)
        if match:
            return content[match.end():]
            
        # If all else fails, try a simple regex to find a number followed by \r\n
        match = re.search(b'\d+\r\n', content)
        if match and match.end() < 100:  # Only if near the start
            return content[match.end():]
            
        # Return as is if we couldn't clean it
        return content


class PaymentScreenshotsStorage(GeneratedImagesStorage):
    """
    Reuse the same implementation but change the bucket name
    """
    bucket_name = 'payments'