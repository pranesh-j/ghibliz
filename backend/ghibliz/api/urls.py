# api/urls.py
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from users.views import RegisterView, UserProfileView, LogoutView
from images.views import ImageTransformAPIView, recent_images
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

# Simple Google login for development
@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """Simplified Google login for development"""
    try:
        # Create a test user
        username = "googleuser"
        email = "googleuser@example.com"
        
        # Get or create user
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': 'Google',
                'last_name': 'User'
            }
        )
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
    except Exception as e:
        return Response({'detail': str(e)}, status=400)

urlpatterns = [
    # Auth endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('google-login/', google_login, name='google-login'),
    
    # Image transformation
    path('transform/', ImageTransformAPIView.as_view(), name='transform-image'),
    path('images/recent/', recent_images, name='recent-images'),
]