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
from django.core.files.storage import default_storage
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
        serializer = ImageUploadSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"Image upload validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        image_file = serializer.validated_data['image']
        style = request.data.get('style', 'ghibli')
        
        logger.info(f"Processing image with style: {style}")

        user = request.user
        user_profile = None
        can_transform = False
        credits_to_deduct = 0

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

        if not can_transform:
            logger.error(f"Authorization check failed unexpectedly for user {user.username if user.is_authenticated else 'Anonymous'}")
            return Response({"error": "Authorization failed."}, status=status.HTTP_403_FORBIDDEN)

        try:
            logger.info(f"Starting image transformation for user {user.username}")
            transformed_image = transform_image_to_ghibli(image_file, style=style)

            preview_image = create_watermarked_preview(transformed_image, apply_watermark=False)

            transformed_image.seek(0)
            preview_image.seek(0)

            if user_profile and credits_to_deduct > 0:
                user_profile.credit_balance -= credits_to_deduct
                user_profile.save()
                logger.info(f"Deducted {credits_to_deduct} credit from {user.username}. New balance: {user_profile.credit_balance}")

                cache.delete(f'user_profile_{user.id}')
                logger.info(f"Invalidated cache for user_profile_{user.id}")

                generated_image = GeneratedImage()
                generated_image.user = user
                generated_image.is_paid = True

                from PIL import Image
                import io

                img_data = transformed_image.getvalue()
                try:
                    pil_image = Image.open(io.BytesIO(img_data))
                    output = io.BytesIO()
                    pil_image.save(output, format=pil_image.format or 'JPEG')
                    clean_img_data = output.getvalue()
                    
                    generated_image.image.save(
                        f"ghibli_{timezone.now().strftime('%Y%m%d%H%M%S')}.jpg",
                        ContentFile(clean_img_data),
                        save=False
                    )
                except Exception as e:
                    logger.error(f"Error cleaning image data: {str(e)}")
                    generated_image.image.save(
                        f"ghibli_{timezone.now().strftime('%Y%m%d%H%M%S')}.jpg",
                        ContentFile(transformed_image.getvalue()),
                        save=False
                    )

                generated_image.preview_image.save(
                    f"preview_{timezone.now().strftime('%Y%m%d%H%M%S')}.jpg",
                    ContentFile(preview_image.getvalue()),
                    save=False
                )

                generated_image.token_expires_at = timezone.now() + timedelta(days=1)

                generated_image.save()
                logger.info(f"Saved generated image {generated_image.id} for user {user.username}")

                serializer = GeneratedImageSerializer(
                    generated_image,
                    context={'request': request}
                )
                response_data = serializer.data

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
@cache_page(60 * 60 * 6)  # Cache for 6 hours
def recent_images(request):
    limit = int(request.query_params.get('limit', 12))
    
    buffer_limit = limit * 2
    images = GeneratedImage.objects.filter(is_paid=True).order_by('-created_at')[:buffer_limit]
    
    result = []
    valid_count = 0
    
    for img in images:
        if not img.preview_image or not default_storage.exists(img.preview_image.name):
            continue
            
        if valid_count >= limit:
            break
            
        preview_url = request.build_absolute_uri(f'/api/clean-image/{img.preview_image.name}')
        original_placeholder = preview_url
        
        result.append({
            'id': img.id,
            'original': original_placeholder,
            'processed': preview_url,
            'created_at': img.created_at.isoformat()
        })
        
        valid_count += 1
    
    while len(result) < limit:
        result.append({
            'id': 9000 + len(result),
            'original': "/api/placeholder/400/300",
            'processed': "/api/placeholder/400/300",
            'created_at': timezone.now().isoformat()
        })
    
    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_images(request):
    images = GeneratedImage.objects.filter(user=request.user).order_by('-created_at')
    serializer = GeneratedImageSerializer(images, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_image(request, image_id):
    token = request.query_params.get('token')
    if not token:
        return Response({"error": "Download token is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        image = GeneratedImage.objects.get(id=image_id, download_token=token, user=request.user)

        if not image.token_is_valid:
            return Response({"error": "Download token has expired"}, status=status.HTTP_403_FORBIDDEN)

        if not image.is_paid:
             return Response({"error": "You don't have permission to download this image"}, status=status.HTTP_403_FORBIDDEN)

        from decouple import config
        import requests
        import re
        
        project_id = config('SUPABASE_PROJECT_ID')
        supabase_url = f"https://{project_id}.supabase.co/storage/v1/object/public/ghiblits/{image.image.name}"
        
        response = requests.get(supabase_url)
        if response.status_code != 200:
            return Response({"error": "Image not found on storage"}, status=status.HTTP_404_NOT_FOUND)
        
        content = response.content
        
        if not content.startswith(b'\x89PNG') and not content.startswith(b'\xff\xd8\xff'):
            png_pos = content.find(b'\x89PNG\r\n\x1a\n')
            jpeg_pos = content.find(b'\xff\xd8\xff')
            
            if png_pos > 0:
                content = content[png_pos:]
            elif jpeg_pos > 0:
                content = content[jpeg_pos:]
            else:
                match = re.search(b'\d+\r\n', content)
                if match and match.end() < 100:
                    content = content[match.end():]
        
        content_type = 'image/jpeg'
        if image.image.name.lower().endswith('.png'):
            content_type = 'image/png'
        
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
    from decouple import config
    
    project_id = config('SUPABASE_PROJECT_ID')
    
    url = f"https://{project_id}.supabase.co/storage/v1/object/public/ghiblits/{image_path}"
    
    try:
        response = requests.get(url)
        if response.status_code != 200:
            return HttpResponse("Image not found", status=404)
        
        content = response.content
        
        if not content.startswith(b'\x89PNG') and not content.startswith(b'\xff\xd8\xff'):
            png_pos = content.find(b'\x89PNG\r\n\x1a\n')
            jpeg_pos = content.find(b'\xff\xd8\xff')
            
            if png_pos > 0:
                content = content[png_pos:]
            elif jpeg_pos > 0:
                content = content[jpeg_pos:]
            else:
                match = re.search(b'\d+\r\n', content)
                if match and match.end() < 100:
                    content = content[match.end():]
        
        content_type = 'image/jpeg'
        if image_path.lower().endswith('.png'):
            content_type = 'image/png'
        
        return HttpResponse(content, content_type=content_type)
    except Exception as e:
        logger.error(f"Error serving cleaned image {image_path}: {str(e)}")
        return HttpResponse("Error processing image", status=500)