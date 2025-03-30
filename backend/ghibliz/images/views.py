# images/views.py
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.core.files.base import ContentFile
from django.utils import timezone
from datetime import timedelta
import base64
import logging

from .serializers import GeneratedImageSerializer, ImageUploadSerializer
from .models import GeneratedImage
from .services import transform_image_to_ghibli, create_watermarked_preview
from users.models import UserProfile

# Configure logging
logger = logging.getLogger(__name__)

class ImageTransformAPIView(views.APIView):
    permission_classes = [AllowAny]  # Allow anonymous for first free transform
    
    def post(self, request):
        # Validate the uploaded image
        serializer = ImageUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the uploaded image
        image_file = serializer.validated_data['image']
        
        # Initialize user and user_profile variables
        user = None
        user_profile = None
        
        # Check if user is authenticated
        if request.user.is_authenticated:
            user = request.user
            # Check if user has credits or has not used free transform
            user_profile = UserProfile.objects.get(user=user)
            
            if not user_profile.free_transform_used and user_profile.credit_balance == 0:
                # First free transform
                user_profile.free_transform_used = True
                user_profile.save()
            elif user_profile.credit_balance > 0:
                # Paid transform, deduct a credit
                user_profile.credit_balance -= 1
                user_profile.save()
            else:
                return Response(
                    {"error": "No credits available. Please purchase credits to continue."}, 
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )
        
        try:
            # Transform the image using OpenAI
            transformed_image = transform_image_to_ghibli(image_file)
            
            # Create the watermarked preview for unpaid images
            preview_image = create_watermarked_preview(transformed_image)
            
            # Reset file position after reading
            transformed_image.seek(0)
            
            # Create response data placeholder
            response_data = {}
            
            # Handle authenticated vs anonymous users differently
            if user:
                # Create the GeneratedImage record for authenticated users
                generated_image = GeneratedImage()
                generated_image.user = user
                
                # If user paid (used credit), mark as paid
                if user_profile and (not user_profile.free_transform_used or user_profile.credit_balance >= 0):
                    generated_image.is_paid = True
                
                # Save images to model (using ContentFile to convert BytesIO to Django File)
                generated_image.image.save(
                    f"ghibli_{timezone.now().strftime('%Y%m%d%H%M%S')}.jpg", 
                    ContentFile(transformed_image.getvalue()), 
                    save=False
                )
                
                # Save preview image
                preview_image.seek(0)
                generated_image.preview_image.save(
                    f"preview_{timezone.now().strftime('%Y%m%d%H%M%S')}.jpg", 
                    ContentFile(preview_image.getvalue()), 
                    save=False
                )
                
                # Set token expiry for a day
                generated_image.token_expires_at = timezone.now() + timedelta(days=1)
                
                # Save the model
                generated_image.save()
                
                # Use serializer for consistent response
                serializer = GeneratedImageSerializer(
                    generated_image, 
                    context={'request': request}
                )
                response_data = serializer.data
            else:
                # For anonymous users, return image data directly without saving to DB
                transformed_image.seek(0)
                preview_image.seek(0)
                
                # Create response with base64-encoded images
                response_data = {
                    "image_url": f"data:image/jpeg;base64,{base64.b64encode(transformed_image.getvalue()).decode()}",
                    "preview_url": f"data:image/jpeg;base64,{base64.b64encode(preview_image.getvalue()).decode()}",
                    "is_paid": False,
                    "created_at": timezone.now().isoformat()
                }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Log the error
            logger.error(f"Image transformation error: {str(e)}")
            
            return Response(
                {"error": "Failed to transform image. Please try again later."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([AllowAny])
def recent_images(request):
    """Get recent public transformed images"""
    limit = int(request.query_params.get('limit', 6))
    
    # Get recent images
    images = GeneratedImage.objects.order_by('-created_at')[:limit]
    
    # Format the response
    result = []
    for img in images:
        # Use actual image URLs if available, otherwise use placeholders
        original_url = request.build_absolute_uri(img.preview_image.url) if img.preview_image else "/api/placeholder/400/300"
        processed_url = request.build_absolute_uri(img.image.url) if img.image else "/api/placeholder/400/300"
        
        result.append({
            'id': img.id,
            'original': original_url,
            'processed': processed_url,
        })
    
    return Response(result)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_images(request):
    """Get images transformed by the current user"""
    images = GeneratedImage.objects.filter(user=request.user).order_by('-created_at')
    serializer = GeneratedImageSerializer(images, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def download_image(request, image_id):
    """Download a transformed image with a valid token"""
    token = request.query_params.get('token')
    if not token:
        return Response({"error": "Download token is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        image = GeneratedImage.objects.get(id=image_id, download_token=token)
        
        # Check if token is valid
        if not image.token_is_valid:
            return Response({"error": "Download token has expired"}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if user has permission
        if image.user != request.user and not image.is_paid:
            return Response({"error": "You don't have permission to download this image"}, status=status.HTTP_403_FORBIDDEN)
        
        # Return the image file
        from django.http import FileResponse
        return FileResponse(image.image.open(), as_attachment=True, filename=f"ghiblified-image-{image_id}.jpg")
    
    except GeneratedImage.DoesNotExist:
        return Response({"error": "Image not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Image download error: {str(e)}")
        return Response({"error": "Failed to download image"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)