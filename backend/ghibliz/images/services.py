# images/services.py
import os
import requests
import base64
from io import BytesIO
import logging
from PIL import Image, ImageDraw
from dotenv import load_dotenv
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def transform_image_to_ghibli(image_file):
    """
    Transform the provided image into Studio Ghibli style using OpenAI API
    
    Args:
        image_file: A file-like object containing the image data
        
    Returns:
        BytesIO: A BytesIO object containing the transformed image
    """
    try:
        # Read the image
        img = Image.open(image_file)
        
        # Store original image info
        original_width, original_height = img.size
        
        # Resize if too large (API limitations)
        max_size = 1024
        if original_width > max_size or original_height > max_size:
            # Calculate new dimensions preserving aspect ratio
            if original_width > original_height:
                new_width = max_size
                new_height = int(original_height * (max_size / original_width))
            else:
                new_height = max_size
                new_width = int(original_width * (max_size / original_height))
                
            img = img.resize((new_width, new_height), Image.LANCZOS)
            
        # Make square (required by the API)
        square_size = max(img.width, img.height)
        square_img = Image.new('RGB', (square_size, square_size), (0, 0, 0))
        
        # Center the image
        paste_x = (square_size - img.width) // 2
        paste_y = (square_size - img.height) // 2
        square_img.paste(img, (paste_x, paste_y))
        
        # Save to BytesIO
        byte_stream = BytesIO()
        square_img.save(byte_stream, format='PNG')
        byte_stream.seek(0)
        
        # Call OpenAI API
        logger.info("Calling OpenAI API to create image variation (Ghibli style)")
        response = client.images.create_variation(
            model="dall-e-2",
            image=byte_stream.getvalue(),
            n=1,
            size="1024x1024",
        )
        
        # Get image URL and download
        image_url = response.data[0].url
        image_response = requests.get(image_url)
        
        if image_response.status_code != 200:
            raise Exception(f"Failed to download image: HTTP {image_response.status_code}")
        
        # Get the transformed image and crop back to original proportions
        transformed_img = Image.open(BytesIO(image_response.content))
        
        # Calculate crop area to match original aspect ratio
        if original_width != original_height:
            if original_width > original_height:
                # Original was landscape
                target_height = int(1024 * original_height / original_width)
                top = (1024 - target_height) // 2
                crop = (0, top, 1024, top + target_height)
            else:
                # Original was portrait
                target_width = int(1024 * original_width / original_height)
                left = (1024 - target_width) // 2
                crop = (left, 0, left + target_width, 1024)
                
            transformed_img = transformed_img.crop(crop)
        
        # Resize to original dimensions
        transformed_img = transformed_img.resize((original_width, original_height), Image.LANCZOS)
        
        # Save to BytesIO
        result = BytesIO()
        transformed_img.save(result, format="JPEG", quality=95)
        result.seek(0)
        
        logger.info("Successfully created Ghibli-style image variation")
        return result
        
    except Exception as e:
        logger.error(f"Error creating image variation: {str(e)}")
        raise Exception(f"Failed to create Ghibli-style image: {str(e)}")


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
        img = img.convert('RGBA')
        
        # Create a transparent overlay
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        # Get dimensions
        width, height = img.size
        
        # Try to load a font
        try:
            from PIL import ImageFont
            font_size = max(16, min(width, height) // 20)  # Responsive font size
            font = ImageFont.truetype("arial.ttf", font_size)
        except Exception:
            font = None
        
        # Watermark text
        text = "Ghibliz Preview"
        
        # Add subtle watermarks in corners only
        padding = max(10, min(width, height) // 30)
        positions = [
            (padding, padding),  # Top left
            (width - padding - len(text)*font_size//2, padding),  # Top right
            (padding, height - padding - font_size),  # Bottom left
            (width - padding - len(text)*font_size//2, height - padding - font_size)  # Bottom right
        ]
        
        # Draw watermarks with very low opacity
        for pos in positions:
            draw.text(pos, text, fill=(255, 255, 255, 75), font=font)
        
        # Composite the image with the overlay
        watermarked = Image.alpha_composite(img, overlay)
        
        # Convert back to RGB for JPEG
        watermarked = watermarked.convert('RGB')
        
        # Save to BytesIO
        result = BytesIO()
        watermarked.save(result, format='JPEG', quality=95)
        result.seek(0)
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating watermarked preview: {str(e)}")
        raise Exception(f"Failed to create watermarked preview: {str(e)}")


def test_openai_connection():
    """
    Test function to verify the OpenAI API connection is working
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        # Simple API call to test connection
        response = client.models.list()
        logger.info("OpenAI API connection successful")
        return True
    except Exception as e:
        logger.error(f"OpenAI API connection failed: {str(e)}")
        return False