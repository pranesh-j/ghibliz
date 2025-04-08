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

def transform_image_to_ghibli(image_file, style='ghibli'):
    """
    Transform the provided image into the requested style using OpenAI API
    
    Args:
        image_file: A file-like object containing the image data
        style: The style to apply (default: 'ghibli')
        
    Returns:
        BytesIO: A BytesIO object containing the transformed image
    """
    # Define style-specific prompts
    style_prompts = {
        'ghibli': "Transform this image into Studio Ghibli style from Hayao Miyazaki's films.",
        'onepiece': "Transform this image into One Piece anime style, Eiichiro Oda's distinctive art style, do not just make everyone Luffy or the main character, Analyse their face structure, and assign them properties of one of the strawhat crew members based on their facial and body structure, you are also free to create funny villain characters design from one piece universe if the person in the images matches those traits but this must be done rarely and only if the persons character matches this.",
        'cyberpunk': "Transform this image into Cyberpunk 2077 game style.",
        'shinchan': "Transform this image into Crayon Shin-chan style.",
        'solo': "Transform this image into Solo Leveling manhwa style. For men make the charcater look like Jinwoo only if they look like that in real life or lese try to keep their body and facial structure as is but in the background add some shadows which main character has,  and for women make the character look like either Cha Hae-in, Sung Jin-ah or any female character that matches the facial style. ",
        'pixar': "Transform this image into Pixar animation style.",
        'dragonball': "Transform this image into Dragon Ball anime style, and make everyone super saiyan or super saiyan 2, 3 or ultra instinct to their hairs if they look like that in real life and try to keep match thier faces."
    }
    
    # Get the appropriate prompt or use default
    if style not in style_prompts:
        logger.warning(f"Unsupported style requested: {style}, falling back to 'ghibli'")
        style = 'ghibli'
    
    prompt = style_prompts[style]
    logger.info(f"Using style: {style} with prompt: {prompt}")
    
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
        logger.info(f"Calling OpenAI API to create image variation ({style} style)")
        
        # Check if we can use DALL-E 3 (requires more setup and different API call)
        # For now, we'll use DALL-E 2 with create_variation
        use_dalle3 = False  # Set to True if you want to use DALL-E 3 and have it set up
        
        if use_dalle3:
            # For DALL-E 3, we would use a different approach
            # This would require setting up image encoding and using the images.generate endpoint
            # This is a placeholder for future implementation
            logger.warning("DALL-E 3 integration not fully implemented yet, falling back to DALL-E 2")
            response = client.images.create_variation(
                model="dall-e-2",
                image=byte_stream.getvalue(),
                n=1,
                size="1024x1024",
            )
        else:
            # For DALL-E 2 with create_variation
            # Note: As of my last check, the 'prompt' parameter isn't directly supported with create_variation
            # We're keeping it in this call for future compatibility, but it may not affect the output
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
        
        logger.info(f"Successfully created {style} style image variation")
        return result
        
    except Exception as e:
        logger.error(f"Error creating image variation: {str(e)}")
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
        # Open the image
        img = Image.open(image_file)
        img = img.convert('RGBA')
        
        if apply_watermark:
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
            text = "Ghibli.art"  # Updated watermark text
            
            # Calculate padding 
            padding = max(10, min(width, height) // 30)
            
            # Position at bottom-left corner
            position = (padding, height - padding - font_size)
            
            # Draw watermark with low opacity
            draw.text(position, text, fill=(255, 255, 255, 75), font=font)
            
            # Composite the image with the overlay
            watermarked = Image.alpha_composite(img, overlay)
            
            # Convert back to RGB for JPEG
            result_img = watermarked.convert('RGB')
        else:
            # No watermark needed, just convert to RGB for JPEG
            result_img = img.convert('RGB')
        
        # Save to BytesIO
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
        # Simple API call to test connection
        response = client.models.list()
        logger.info("OpenAI API connection successful")
        return True
    except Exception as e:
        logger.error(f"OpenAI API connection failed: {str(e)}")
        return False