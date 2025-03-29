# images/services.py
import os
import requests
import base64
from io import BytesIO
import openai
from django.conf import settings
from dotenv import load_dotenv
from PIL import Image, ImageDraw

load_dotenv()

# Initialize OpenAI client
openai.api_key = os.getenv('OPENAI_API_KEY')

def transform_image_to_ghibli(image_file):
    """
    Transform the provided image into Studio Ghibli style using OpenAI API
    
    Args:
        image_file: A file-like object containing the image data
        
    Returns:
        BytesIO: A BytesIO object containing the transformed image
    """
    try:
        # Read the image and convert to base64
        img = Image.open(image_file)
        
        # Resize if the image is too large (DALL-E has size limitations)
        max_size = 1024
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.LANCZOS)
        
        # Convert to RGB if it's not
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Save to BytesIO object
        buffered = BytesIO()
        img.save(buffered, format="JPEG")
        
        # Encode to base64
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        # Call OpenAI API
        response = openai.Image.create_variation(
            image=buffered,
            n=1,
            size="1024x1024",
            response_format="b64_json"
        )
        
        # Decode the response
        transformed_image_data = base64.b64decode(response['data'][0]['b64_json'])
        transformed_image = BytesIO(transformed_image_data)
        transformed_image.seek(0)
        
        return transformed_image
    
    except Exception as e:
        # Handle the error gracefully
        print(f"Error transforming image: {str(e)}")
        raise Exception(f"Failed to transform image: {str(e)}")

def create_watermarked_preview(image_file):
    """
    Add a watermark to the image for preview purposes
    
    Args:
        image_file: A file-like object containing the image data
        
    Returns:
        BytesIO: A BytesIO object containing the watermarked image
    """
    try:
        # Open the image
        img = Image.open(image_file)
        
        # Create a semi-transparent overlay for watermark
        watermark_text = "Ghiblify Preview"
        
        # Add watermark text
        # This is a simple implementation - for production you'd want
        # a more sophisticated watermark that can't be easily cropped out
        draw = ImageDraw.Draw(img)
        width, height = img.size
        
        # Try to load a font, fall back to default if not available
        try:
            from PIL import ImageFont
            font = ImageFont.truetype("arial.ttf", 36)
        except IOError:
            font = None
        
        # Draw multiple watermarks across the image
        for i in range(0, width, 200):
            for j in range(0, height, 200):
                draw.text((i, j), watermark_text, fill=(255, 255, 255, 128), font=font)
        
        # Save to BytesIO object
        buffered = BytesIO()
        img.save(buffered, format="JPEG")
        buffered.seek(0)
        
        return buffered
    
    except Exception as e:
        print(f"Error creating watermarked preview: {str(e)}")
        raise Exception(f"Failed to create watermarked preview: {str(e)}")