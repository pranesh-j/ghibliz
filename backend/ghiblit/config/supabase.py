import boto3
from botocore.client import Config
from io import BytesIO
from decouple import config
import re

class SupabaseClient:
    """Custom client for Supabase Storage that handles their specific response format"""
    
    def __init__(self):
        self.project_id = config('SUPABASE_PROJECT_ID')
        self.access_key = config('SUPABASE_STORAGE_KEY')
        self.secret_key = config('SUPABASE_STORAGE_SECRET')
        self.endpoint_url = f"https://{self.project_id}.supabase.co/storage/v1/s3"
        
        # Create S3 client
        self.client = boto3.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            config=Config(signature_version='s3v4'),
        )
    
    def get_object(self, bucket_name, object_key):
        """Get object and properly parse the Supabase response"""
        try:
            # Get object directly from S3-compatible API
            response = self.client.get_object(Bucket=bucket_name, Key=object_key)
            
            # Read response content
            content = response['Body'].read()
            
            # Clean the content - Supabase prepends chunk size and other data
            cleaned_content = self._clean_content(content)
            
            return {
                'content': cleaned_content,
                'content_type': response.get('ContentType', 'application/octet-stream'),
                'metadata': response.get('Metadata', {}),
            }
        except Exception as e:
            raise Exception(f"Error getting object {object_key}: {str(e)}")
    
    def _clean_content(self, content):
        """Clean the content received from Supabase to remove any metadata headers"""
        png_header = b'\x89PNG\r\n\x1a\n'
        png_pos = content.find(png_header)
        if png_pos > 0:
            return content[png_pos:]
        
        jpeg_header = b'\xff\xd8\xff'
        jpeg_pos = content.find(jpeg_header)
        if jpeg_pos > 0:
            return content[jpeg_pos:]
        
        chunk_pattern = re.compile(b'^([\d]+)\r\n')
        match = chunk_pattern.match(content)
        if match:
            header_end = match.end()
            return content[header_end:]
            
        headers_end = content.find(b'\r\n\r\n')
        if headers_end > 0:
            return content[headers_end+4:]
            
        return content
    
    def get_public_url(self, bucket_name, object_key):
        """Get the public URL for an object"""
        return f"https://{self.project_id}.supabase.co/storage/v1/object/public/{bucket_name}/{object_key}"
    
    def upload_file(self, file_obj, bucket_name, object_key, content_type=None, acl='public-read'):
        """Upload a file to Supabase Storage"""
        extra_args = {'ACL': acl}
        
        if content_type:
            extra_args['ContentType'] = content_type
            
        self.client.upload_fileobj(
            file_obj,
            bucket_name,
            object_key,
            ExtraArgs=extra_args
        )
        
        return self.get_public_url(bucket_name, object_key)