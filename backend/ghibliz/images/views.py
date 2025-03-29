# images/views.py
from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.core.files.base import ContentFile
from .serializers import GeneratedImageSerializer, ImageUploadSerializer
from .models import GeneratedImage
from .services import transform_image_to_ghibli, create_watermarked_preview
from users.models import UserProfile
from django.utils import timezone
from datetime import timedelta

class ImageTransformAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]  # Allow anonymous for first free transform
    
    def post(self, request):
        # Validate the uploaded image
        serializer = ImageUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the uploaded image
        image_file = serializer.validated_data['image']
        
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
        else:
            # Anonymous user - only allow free transform
            # In production, might want to track by IP or session to prevent abuse
            user = None
        
        try:
            # Transform the image using OpenAI
            transformed_image = transform_image_to_ghibli(image_file)
            
            # Create the watermarked preview for unpaid images
            preview_image = create_watermarked_preview(transformed_image)
            
            # Reset file position after reading
            transformed_image.seek(0)
            
            # Create the GeneratedImage record
            generated_image = GeneratedImage()
            if user:
                generated_image.user = user
                
                # If user paid (used credit), mark as paid
                if request.user.is_authenticated and user_profile.credit_balance >= 0:
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
            
            # Return the result
            serializer = GeneratedImageSerializer(
                generated_image, 
                context={'request': request}
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Log the error
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Image transformation error: {str(e)}")
            
            return Response(
                {"error": "Failed to transform image. Please try again later."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )