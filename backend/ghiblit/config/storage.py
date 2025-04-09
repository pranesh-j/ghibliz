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
    """
    Custom storage class for generated images.
    """
    bucket_name = 'ghiblits'
    file_overwrite = False
    default_acl = 'public-read'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
        )
    
    def _save(self, name, content):
        """
        Override the _save method to handle direct upload with proper metadata.
        """
        try:
            content.seek(0)
            img_data = content.read()
            content.seek(0)
            
            img = Image.open(BytesIO(img_data))
            
            content_type = f"image/{img.format.lower()}" if img.format else 'image/jpeg'
            
            self.client.upload_fileobj(
                content,
                self.bucket_name,
                name,
                ExtraArgs={
                    'ContentType': content_type,
                    'ACL': 'public-read'
                }
            )
            
            return name
        except Exception as e:
            logger.error(f"Error saving image to Supabase: {str(e)}")
            return super()._save(name, content)
    
    def url(self, name):
        """
        Generate the correct public URL format for Supabase.
        """
        project_id = config('SUPABASE_PROJECT_ID')
        name = name.lstrip('/')
        return f"https://{project_id}.supabase.co/storage/v1/object/public/{self.bucket_name}/{name}"
    
    def _open(self, name, mode='rb'):
        """
        Override open method to clean up image data downloaded from Supabase.
        """
        name = self._normalize_name(self._clean_name(name))
        url = self.url(name)
        
        try:
            response = requests.get(url)
            if response.status_code != 200:
                file_content = super()._open(name, mode).read()
                file_content = self._clean_supabase_content(file_content)
            else:
                file_content = response.content
                
            return ContentFile(file_content)
        except Exception as e:
            logger.error(f"Error reading file from Supabase: {str(e)}")
            file_obj = super()._open(name, mode)
            file_content = file_obj.read()
            clean_content = self._clean_supabase_content(file_content)
            return ContentFile(clean_content)
    
    def _clean_supabase_content(self, content):
        """
        Clean Supabase's extra metadata from file content.
        """
        if not content:
            return content
            
        if content.startswith(b'\x89PNG') or content.startswith(b'\xff\xd8\xff'):
            return content
            
        png_pos = content.find(b'\x89PNG\r\n\x1a\n')
        jpeg_pos = content.find(b'\xff\xd8\xff')
        
        if png_pos > 0:
            return content[png_pos:]
        if jpeg_pos > 0:
            return content[jpeg_pos:]
            
        match = re.search(b'\r\n\r\n', content)
        if match:
            return content[match.end():]
            
        match = re.search(b'\d+\r\n', content)
        if match and match.end() < 100:
            return content[match.end():]
            
        return content

class PaymentScreenshotsStorage(GeneratedImagesStorage):
    """
    Reuse the same implementation but change the bucket name.
    """
    bucket_name = 'payments'