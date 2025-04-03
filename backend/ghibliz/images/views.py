# images/views.py
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated # Added IsAuthenticated
from django.core.files.base import ContentFile
from django.utils import timezone
from datetime import timedelta
import base64
import logging

from .serializers import GeneratedImageSerializer, ImageUploadSerializer
from .models import GeneratedImage
from .services import transform_image_to_ghibli, create_watermarked_preview
from users.models import UserProfile

from django.views.decorators.cache import cache_page
from django.core.cache import cache # Import cache


# Configure logging
logger = logging.getLogger(__name__)

class ImageTransformAPIView(views.APIView):
    # Allow anonymous access - we check authentication inside post
    permission_classes = [AllowAny]

    def post(self, request):
        # Validate the uploaded image
        serializer = ImageUploadSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"Image upload validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Get the uploaded image
        image_file = serializer.validated_data['image']

        # Initialize user and user_profile variables
        user = request.user
        user_profile = None
        can_transform = False
        credits_to_deduct = 0

        # --- CHANGE: Updated Credit Check Logic ---
        if user.is_authenticated:
            try:
                user_profile = UserProfile.objects.get(user=user)
                # Check if user has credits
                if user_profile.credit_balance > 0:
                    can_transform = True
                    credits_to_deduct = 1 # Will deduct 1 credit
                    logger.info(f"User {user.username} has {user_profile.credit_balance} credits. Proceeding with paid transform.")
                else:
                    # No credits left
                    logger.info(f"User {user.username} has 0 credits. Payment required.")
                    return Response(
                        {"error": "No credits available. Please purchase credits to continue."},
                        status=status.HTTP_402_PAYMENT_REQUIRED
                    )
            except UserProfile.DoesNotExist:
                logger.error(f"UserProfile not found for authenticated user {user.username}")
                return Response({"error": "User profile not found."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # Anonymous user - they cannot transform images (no free transform anymore)
            logger.info("Anonymous user attempted transformation. Login required.")
            return Response(
                {"error": "Please sign in to transform images."},
                status=status.HTTP_401_UNAUTHORIZED # Use 401 Unauthorized
            )

        # If the checks passed, proceed with transformation
        if not can_transform:
             # This case should theoretically be caught above, but added as a safeguard
             logger.error(f"Authorization check failed unexpectedly for user {user.username if user.is_authenticated else 'Anonymous'}")
             return Response({"error": "Authorization failed."}, status=status.HTTP_403_FORBIDDEN)

        try:
            logger.info(f"Starting image transformation for user {user.username}")
            # Transform the image using OpenAI
            transformed_image = transform_image_to_ghibli(image_file)

            # Create the preview image (no watermark needed as all transforms are paid/credited)
            preview_image = create_watermarked_preview(transformed_image, apply_watermark=False) # Watermark always false now

            # Reset file positions after reading
            transformed_image.seek(0)
            preview_image.seek(0) # Reset preview as well

            # --- CHANGE: Deduct credit and Save Image (only for authenticated users) ---
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
                generated_image.is_paid = True # All credited transforms are considered 'paid' access

                # Save images to model
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
                # This block should not be reached if authentication/credit checks are correct
                logger.error("Reached unexpected state during image saving.")
                return Response({"error": "An internal error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        except Exception as e:
            # Log the error
            logger.exception(f"Image transformation error for user {user.username if user.is_authenticated else 'Anonymous'}: {str(e)}") # Use logger.exception for stack trace

            return Response(
                {"error": "Failed to transform image. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# --- No changes needed below this line in this file for the requested fixes ---

@api_view(['GET'])
@permission_classes([AllowAny])
@cache_page(60 * 10)  # Cache for 10 minutes
def recent_images(request):
    """Get recent public transformed images"""
    limit = int(request.query_params.get('limit', 6))

    # Get recent images (Ensure they are marked as paid or belong to a valid user context if needed)
    # For now, showing all generated images marked as paid. Adjust filtering if privacy needed.
    images = GeneratedImage.objects.filter(is_paid=True).order_by('-created_at')[:limit]

    # Format the response
    result = []
    for img in images:
        # Use preview URL for gallery, assuming full image requires download/auth
        preview_url = request.build_absolute_uri(img.preview_image.url) if img.preview_image else "/api/placeholder/400/300"
        # For simplicity, gallery shows preview twice, or you could fetch original if needed
        original_placeholder = preview_url # Or fetch original image URL if desired for gallery

        result.append({
            'id': img.id,
            'original': original_placeholder, # Showing preview as 'original' in gallery context
            'processed': preview_url,         # Showing preview as 'processed'
        })

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated]) # Changed from permissions.IsAuthenticated
def user_images(request):
    """Get images transformed by the current user"""
    images = GeneratedImage.objects.filter(user=request.user).order_by('-created_at')
    serializer = GeneratedImageSerializer(images, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated]) # Require authentication to attempt download
def download_image(request, image_id):
    """Download a transformed image with a valid token"""
    token = request.query_params.get('token')
    if not token:
        return Response({"error": "Download token is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Ensure the image belongs to the requesting user OR handle public images if applicable
        image = GeneratedImage.objects.get(id=image_id, download_token=token, user=request.user) # Added user=request.user

        # Check if token is valid
        if not image.token_is_valid:
            return Response({"error": "Download token has expired"}, status=status.HTTP_403_FORBIDDEN)

        # Check if user has permission (already checked by filtering on user, but kept for clarity)
        if not image.is_paid: # Should always be true now for generated images
             return Response({"error": "You don't have permission to download this image"}, status=status.HTTP_403_FORBIDDEN)

        # Return the image file
        from django.http import FileResponse
        logger.info(f"User {request.user.username} downloading image {image_id}")
        return FileResponse(image.image.open(), as_attachment=True, filename=f"ghiblified-image-{image_id}.jpg")

    except GeneratedImage.DoesNotExist:
        logger.warning(f"Image download attempt failed: Image {image_id} not found or token/user mismatch for user {request.user.username}")
        return Response({"error": "Image not found or access denied"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Image download error for image {image_id}, user {request.user.username}: {str(e)}")
        return Response({"error": "Failed to download image"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)