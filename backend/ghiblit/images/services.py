import os
import requests
import base64
from io import BytesIO
import logging
from PIL import Image, ImageDraw
from dotenv import load_dotenv
from openai import OpenAI
import tempfile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

client = OpenAI(
    api_key=os.getenv('OPENAI_API_KEY'),
    timeout=300 
)

def transform_image_to_ghibli(image_file, style='ghibli'):
    """
    Transform the provided image into the requested style using OpenAI API
    
    Args:
        image_file: A file-like object containing the image data
        style: The style to apply (default: 'ghibli')
        
    Returns:
        BytesIO: A BytesIO object containing the transformed image
    """
    from .models import StylePrompt

    try:
        style_prompt = StylePrompt.objects.get(style_key=style, is_active=True)
        prompt = style_prompt.prompt
    except StylePrompt.DoesNotExist:
        logger.warning(f"Style '{style}' not found, falling back to ghibli")
        try:
            style_prompt = StylePrompt.objects.get(style_key='ghibli', is_active=True)
            prompt = style_prompt.prompt
            style = 'ghibli'
        except StylePrompt.DoesNotExist:
            logger.error("Default 'ghibli' style not found in database")
            raise Exception("Style configuration error")
    
    logger.info(f"Using style: {style} with prompt: {prompt}")
    
    try:
        img = Image.open(image_file)
        original_width, original_height = img.size
        
        max_size = 1024
        if original_width > max_size or original_height > max_size:
            if original_width > original_height:
                new_width = max_size
                new_height = int(original_height * (max_size / original_width))
            else:
                new_height = max_size
                new_width = int(original_width * (max_size / original_height))
                
            img = img.resize((new_width, new_height), Image.LANCZOS)
            
        square_size = max(img.width, img.height)
        square_img = Image.new('RGB', (square_size, square_size), (0, 0, 0))
        
        paste_x = (square_size - img.width) // 2
        paste_y = (square_size - img.height) // 2
        square_img.paste(img, (paste_x, paste_y))
        
        # Save to BytesIO instead of temporary file
        byte_stream = BytesIO()
        square_img.save(byte_stream, format="PNG")
        byte_stream.seek(0)
        
        logger.info(f"Calling OpenAI API to transform image with {style} style using gpt-image-1 model")

        # Use the edit endpoint and get base64 data from response
        response = client.images.edit(
            model="gpt-image-1",
            image=('image.png', byte_stream),
            prompt=prompt,
            n=1,
            size="1024x1024"
        )

        # Extract base64 data from the response
        image_base64 = response.data[0].b64_json
        if not image_base64:
            raise Exception("OpenAI API did not return image data")
            
        logger.info(f"Received base64 image data from OpenAI.")
        
        # Decode base64 to binary
        image_bytes = base64.b64decode(image_base64)
        
        # Open the image from bytes
        transformed_img = Image.open(BytesIO(image_bytes))
        
        if original_width != original_height:
            if original_width > original_height:
                target_height = int(1024 * original_height / original_width)
                top = (1024 - target_height) // 2
                crop = (0, top, 1024, top + target_height)
            else:
                target_width = int(1024 * original_width / original_height)
                left = (1024 - target_width) // 2
                crop = (left, 0, left + target_width, 1024)
                
            transformed_img = transformed_img.crop(crop)
        
        transformed_img = transformed_img.resize((original_width, original_height), Image.LANCZOS)
        
        result = BytesIO()
        transformed_img.save(result, format="JPEG", quality=95)
        result.seek(0)
        
        logger.info(f"Successfully created {style} style image")
        return result
        
    except Exception as e:
        logger.error(f"Error transforming image: {str(e)}", exc_info=True)
        if hasattr(e, 'response'):
            logger.error(f"OpenAI API Response: {e.response.text}")
        raise Exception(f"Failed to create {style} style image: {str(e)}")

def create_watermarked_preview(image_file, apply_watermark=True):
    """
    Add a watermark to the image for preview purposes if apply_watermark is True,
    otherwise just convert to a proper format
    
    Args:
        image_file: A file-like object containing the image data
        apply_watermark: Whether to apply the watermark (default: True)
        
    Returns:
        BytesIO: A BytesIO object containing the image (watermarked if apply_watermark is True)
    """
    try:
        img = Image.open(image_file)
        img = img.convert('RGBA')
        
        if apply_watermark:
            overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            
            width, height = img.size
            
            try:
                from PIL import ImageFont
                font_size = max(16, min(width, height) // 20)
                font = ImageFont.truetype("arial.ttf", font_size)
            except Exception:
                font = None
            
            text = "Ghibli.art"
            
            padding = max(10, min(width, height) // 30)
            
            position = (padding, height - padding - font_size)
            
            draw.text(position, text, fill=(255, 255, 255, 75), font=font)
            
            watermarked = Image.alpha_composite(img, overlay)
            result_img = watermarked.convert('RGB')
        else:
            result_img = img.convert('RGB')
        
        result = BytesIO()
        result_img.save(result, format='JPEG', quality=95)
        result.seek(0)
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating image preview: {str(e)}")
        raise Exception(f"Failed to create image preview: {str(e)}")

def test_openai_connection():
    """
    Test function to verify the OpenAI API connection is working
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        response = client.models.list()
        logger.info("OpenAI API connection successful")
        return True
    except Exception as e:
        logger.error(f"OpenAI API connection failed: {str(e)}")
        return False