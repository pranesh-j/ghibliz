# api/views_auth.py
import os
import logging
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from users.models import UserProfile
from django.core.cache import cache # Import cache


# Configure logging
logger = logging.getLogger(__name__)

class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        """Process Google login/signup"""
        id_token_jwt = request.data.get('id_token')

        if not id_token_jwt:
            return Response(
                {'error': 'No Google token provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get Google Client ID from environment
            CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')

            if not CLIENT_ID:
                logger.error("GOOGLE_CLIENT_ID environment variable not set")
                return Response(
                    {'error': 'Google authentication not configured properly'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                id_token_jwt,
                google_requests.Request(),
                CLIENT_ID
            )

            # Get user info from the ID token
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Invalid token issuer')

            # Extract user data
            google_id = idinfo['sub']
            email = idinfo.get('email', '')

            # Get name information
            name = idinfo.get('name', '')
            given_name = idinfo.get('given_name', '')
            family_name = idinfo.get('family_name', '')

            if not given_name and name:
                # If we only have full name, try to split it
                name_parts = name.split(' ', 1)
                given_name = name_parts[0]
                family_name = name_parts[1] if len(name_parts) > 1 else ''

            picture = idinfo.get('picture', '')

            logger.info(f"Google user authenticated: {email}")

            # Check if user exists, otherwise create a new one
            user = None
            profile_created = False # Flag to check if profile was newly created
            try:
                # Try to find user by email first (recommended approach)
                user = User.objects.get(email=email)

                # Update names if they've changed
                if user.first_name != given_name or user.last_name != family_name:
                    user.first_name = given_name
                    user.last_name = family_name
                    user.save()
                    logger.info(f"Updated user profile names for {email}")

            except User.DoesNotExist:
                # Create new user
                username = f"google_{google_id}"[:30]  # Max 30 chars

                # Make username unique if it already exists
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}_{counter}"
                    counter += 1

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=given_name,
                    last_name=family_name,
                )
                logger.info(f"Created new user for {email}")
                # Profile will be created by the signal, but we note this

            # Get or create user profile
            # The signal users/models.py handles profile creation automatically
            # We fetch it here to determine if it's brand new
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile_created = created # Store if the profile was just made

            # --- CHANGE: Grant 1 credit ONLY if the profile was newly created ---

            if profile_created:
                profile.credit_balance = 1
                # Ensure free_transform_used is False initially if you keep the field
                profile.free_transform_used = False
                profile.save()
                logger.info(f"Granted 1 initial credit to new user {email}")
            # --- REMOVED: No longer give 100 credits on every login ---
            # profile.credit_balance = 100 # REMOVED THIS LINE
            # profile.save()             # REMOVED THIS LINE

            # Invalidate cache for this user upon login/signup to ensure fresh data
            cache.delete(f'user_profile_{user.id}')

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            # Fetch the latest profile state AFTER potential update
            profile.refresh_from_db()

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'profile': {
                        'credit_balance': profile.credit_balance,
                        'free_transform_used': profile.free_transform_used, # Keep sending if frontend uses it
                    }
                }
            })

        except ValueError as e:
            # Invalid token
            logger.error(f"Invalid Google token: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            # Other errors
            logger.exception(f"Google authentication error: {str(e)}")
            return Response(
                {'error': f'Authentication failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )