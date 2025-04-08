# images/views.py
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.core.files.base import ContentFile
from django.utils import timezone
from datetime import timedelta
import logging
import requests
import re
from django.http import HttpResponse, Http404

from .serializers import GeneratedImageSerializer, ImageUploadSerializer
from .models import GeneratedImage
from .services import transform_image_to_ghibli, create_watermarked_preview
from users.models import UserProfile

from django.views.decorators.cache import cache_page
from django.core.cache import cache

# Configure logging
logger = logging.getLogger(__name__)

class ImageTransformAPIView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Validate the uploaded image
        serializer = ImageUploadSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"Image upload validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Get the uploaded image and style
        image_file = serializer.validated_data['image']
        style = request.data.get('style', 'ghibli')  # Default to 'ghibli' if not provided
        
        logger.info(f"Processing image with style: {style}")

        # Initialize user and user_profile variables
        user = request.user
        user_profile = None
        can_transform = False
        credits_to_deduct = 0

        # Check if user is authenticated and has credits
        if user.is_authenticated:
            try:
                user_profile = UserProfile.objects.get(user=user)
                if user_profile.credit_balance > 0:
                    can_transform = True
                    credits_to_deduct = 1
                    logger.info(f"User {user.username} has {user_profile.credit_balance} credits. Proceeding with paid transform.")
                else:
                    logger.info(f"User {user.username} has 0 credits. Payment required.")
                    return Response(
                        {"error": "No credits available. Please purchase credits to continue."},
                        status=status.HTTP_402_PAYMENT_REQUIRED
                    )
            except UserProfile.DoesNotExist:
                logger.error(f"UserProfile not found for authenticated user {user.username}")
                return Response({"error": "User profile not found."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            logger.info("Anonymous user attempted transformation. Login required.")
            return Response(
                {"error": "Please sign in to transform images."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Final check before proceeding
        if not can_transform:
            logger.error(f"Authorization check failed unexpectedly for user {user.username if user.is_authenticated else 'Anonymous'}")
            return Response({"error": "Authorization failed."}, status=status.HTTP_403_FORBIDDEN)

        try:
            logger.info(f"Starting image transformation for user {user.username}")
            # Transform the image using OpenAI with specified style
            transformed_image = transform_image_to_ghibli(image_file, style=style)

            # Create the preview image (no watermark needed as all transforms are paid/credited)
            preview_image = create_watermarked_preview(transformed_image, apply_watermark=False)

            # Reset file positions after reading
            transformed_image.seek(0)
            preview_image.seek(0)

            # Deduct credit and save image
            if user_profile and credits_to_deduct > 0:
                user_profile.credit_balance -= credits_to_deduct
                user_profile.save()
                logger.info(f"Deducted {credits_to_deduct} credit from {user.username}. New balance: {user_profile.credit_balance}")

                # Invalidate the user profile cache immediately after balance change
                cache.delete(f'user_profile_{user.id}')
                logger.info(f"Invalidated cache for user_profile_{user.id}")

                # Create the GeneratedImage record
                generated_image = GeneratedImage()
                generated_image.user = user
                generated_image.is_paid = True

                # Clean and save images to model
                from PIL import Image
                import io

                # Ensure we're working with clean image data
                img_data = transformed_image.getvalue()
                try:
                    # This re-saves the image through PIL, guaranteeing clean data
                    pil_image = Image.open(io.BytesIO(img_data))
                    output = io.BytesIO()
                    pil_image.save(output, format=pil_image.format or 'JPEG')
                    clean_img_data = output.getvalue()
                    
                    # Save the cleaned image
                    generated_image.image.save(
                        f"ghibli_{timezone.now().strftime('%Y%m%d%H%M%S')}.jpg",
                        ContentFile(clean_img_data),
                        save=False
                    )
                except Exception as e:
                    # Fall back to original method if there's an error
                    logger.error(f"Error cleaning image data: {str(e)}")
                    generated_image.image.save(
                        f"ghibli_{timezone.now().strftime('%Y%m%d%H%M%S')}.jpg",
                        ContentFile(transformed_image.getvalue()),
                        save=False
                    )

                # Save preview image
                generated_image.preview_image.save(
                    f"preview_{timezone.now().strftime('%Y%m%d%H%M%S')}.jpg",
                    ContentFile(preview_image.getvalue()),
                    save=False
                )

                # Set token expiry
                generated_image.token_expires_at = timezone.now() + timedelta(days=1)

                # Save the model
                generated_image.save()
                logger.info(f"Saved generated image {generated_image.id} for user {user.username}")

                # Use serializer for consistent response
                serializer = GeneratedImageSerializer(
                    generated_image,
                    context={'request': request}
                )
                response_data = serializer.data

                # Add the updated credit balance to the response for immediate feedback
                response_data['updated_credit_balance'] = user_profile.credit_balance

                return Response(response_data, status=status.HTTP_201_CREATED)

            else:
                logger.error("Reached unexpected state during image saving.")
                return Response({"error": "An internal error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            logger.exception(f"Image transformation error for user {user.username if user.is_authenticated else 'Anonymous'}: {str(e)}")
            return Response(
                {"error": "Failed to transform image. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET'])
@permission_classes([AllowAny])
@cache_page(60 * 10)  # Cache for 10 minutes
def recent_images(request):
    """Get recent public transformed images"""
    limit = int(request.query_params.get('limit', 6))

    # Get recent images (Ensure they are marked as paid or belong to a valid user context if needed)
    images = GeneratedImage.objects.filter(is_paid=True).order_by('-created_at')[:limit]

    # Format the response
    result = []
    for img in images:
        # Use preview URL for gallery, assuming full image requires download/auth
        # Replace direct Supabase URLs with our clean proxy URL
        if img.preview_image:
            preview_url = request.build_absolute_uri(f'/api/clean-image/{img.preview_image.name}')
        else:
            preview_url = "/api/placeholder/400/300"
            
        original_placeholder = preview_url

        result.append({
            'id': img.id,
            'original': original_placeholder,
            'processed': preview_url,
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_images(request):
    """Get images transformed by the current user"""
    images = GeneratedImage.objects.filter(user=request.user).order_by('-created_at')
    serializer = GeneratedImageSerializer(images, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
# Update this function in your views.py file

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_image(request, image_id):
    """Download a transformed image with a valid token"""
    token = request.query_params.get('token')
    if not token:
        return Response({"error": "Download token is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Ensure the image belongs to the requesting user
        image = GeneratedImage.objects.get(id=image_id, download_token=token, user=request.user)

        # Check if token is valid
        if not image.token_is_valid:
            return Response({"error": "Download token has expired"}, status=status.HTTP_403_FORBIDDEN)

        # Check if user has permission
        if not image.is_paid:
             return Response({"error": "You don't have permission to download this image"}, status=status.HTTP_403_FORBIDDEN)

        # Get the clean image data directly
        from decouple import config
        import requests
        import re
        
        # Construct the URL to the image in Supabase
        project_id = config('SUPABASE_PROJECT_ID')
        supabase_url = f"https://{project_id}.supabase.co/storage/v1/object/public/ghiblits/{image.image.name}"
        
        # Fetch the image
        response = requests.get(supabase_url)
        if response.status_code != 200:
            return Response({"error": "Image not found on storage"}, status=status.HTTP_404_NOT_FOUND)
        
        # Get and clean the content
        content = response.content
        
        # Clean the content if needed
        if not content.startswith(b'\x89PNG') and not content.startswith(b'\xff\xd8\xff'):
            # Try to find image signature
            png_pos = content.find(b'\x89PNG\r\n\x1a\n')
            jpeg_pos = content.find(b'\xff\xd8\xff')
            
            if png_pos > 0:
                content = content[png_pos:]
            elif jpeg_pos > 0:
                content = content[jpeg_pos:]
            else:
                # Try to remove content-length header
                match = re.search(b'\d+\r\n', content)
                if match and match.end() < 100:
                    content = content[match.end():]
        
        # Determine content type
        content_type = 'image/jpeg'  # Default
        if image.image.name.lower().endswith('.png'):
            content_type = 'image/png'
        
        # Return as a downloadable file
        logger.info(f"User {request.user.username} downloading image {image_id}")
        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="ghiblified-image-{image_id}.jpg"'
        return response

    except GeneratedImage.DoesNotExist:
        logger.warning(f"Image download attempt failed: Image {image_id} not found or token/user mismatch for user {request.user.username}")
        return Response({"error": "Image not found or access denied"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Image download error for image {image_id}, user {request.user.username}: {str(e)}")
        return Response({"error": "Failed to download image"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



def serve_cleaned_image(request, image_path):
    """
    Serves an image from Supabase with headers cleaned
    """
    from decouple import config
    
    # Get project ID
    project_id = config('SUPABASE_PROJECT_ID')
    
    # Construct URL to fetch from Supabase
    url = f"https://{project_id}.supabase.co/storage/v1/object/public/ghiblits/{image_path}"
    
    try:
        # Fetch the image
        response = requests.get(url)
        if response.status_code != 200:
            return HttpResponse("Image not found", status=404)
        
        # Get content
        content = response.content
        
        # Clean the content if needed
        if not content.startswith(b'\x89PNG') and not content.startswith(b'\xff\xd8\xff'):
            # Try to find image signature
            png_pos = content.find(b'\x89PNG\r\n\x1a\n')
            jpeg_pos = content.find(b'\xff\xd8\xff')
            
            if png_pos > 0:
                content = content[png_pos:]
            elif jpeg_pos > 0:
                content = content[jpeg_pos:]
            else:
                # Try to remove content-length header
                match = re.search(b'\d+\r\n', content)
                if match and match.end() < 100:
                    content = content[match.end():]
        
        # Determine content type
        content_type = 'image/jpeg'  # Default
        if image_path.lower().endswith('.png'):
            content_type = 'image/png'
        
        # Return the cleaned image
        return HttpResponse(content, content_type=content_type)
    except Exception as e:
        logger.error(f"Error serving cleaned image {image_path}: {str(e)}")
        return HttpResponse("Error processing image", status=500)