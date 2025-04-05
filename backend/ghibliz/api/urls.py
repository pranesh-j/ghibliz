from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from users.views import UserProfileView, LogoutView
from images.views import ImageTransformAPIView, recent_images
from .views_auth import GoogleLoginView  # Import the new view

urlpatterns = [
    # Auth endpoints
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    
    # Image transformation
    path('transform/', ImageTransformAPIView.as_view(), name='transform-image'),
    path('images/recent/', recent_images, name='recent-images'),
]