# api/urls.py
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from users.views import UserProfileView, LogoutView
from images.views import ImageTransformAPIView, recent_images, serve_cleaned_image, download_image, user_images
from .views_auth import GoogleLoginView

urlpatterns = [
    # Auth endpoints
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    
    # Image endpoints
    path('transform/', ImageTransformAPIView.as_view(), name='transform-image'),
    path('images/recent/', recent_images, name='recent-images'),
    path('images/user/', user_images, name='user-images'),
    path('images/download/<int:image_id>/', download_image, name='download-image'),  # Add this line
    
    # Image cleaning proxy
    path('clean-image/<path:image_path>', serve_cleaned_image, name='clean-image'),
]