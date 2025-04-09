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
from django.core.cache import cache 

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
            CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')

            if not CLIENT_ID:
                logger.error("GOOGLE_CLIENT_ID environment variable not set")
                return Response(
                    {'error': 'Google authentication not configured properly'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            idinfo = id_token.verify_oauth2_token(
                id_token_jwt,
                google_requests.Request(),
                CLIENT_ID
            )

            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Invalid token issuer')

            google_id = idinfo['sub']
            email = idinfo.get('email', '')
            name = idinfo.get('name', '')
            given_name = idinfo.get('given_name', '')
            family_name = idinfo.get('family_name', '')

            if not given_name and name:
                name_parts = name.split(' ', 1)
                given_name = name_parts[0]
                family_name = name_parts[1] if len(name_parts) > 1 else ''

            picture = idinfo.get('picture', '')

            logger.info(f"Google user authenticated: {email}")

            user = None
            profile_created = False
            try:
                user = User.objects.get(email=email)
                if user.first_name != given_name or user.last_name != family_name:
                    user.first_name = given_name
                    user.last_name = family_name
                    user.save()
                    logger.info(f"Updated user profile names for {email}")

            except User.DoesNotExist:
                username = f"google_{google_id}"[:30]
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

            profile, created = UserProfile.objects.get_or_create(user=user)
            profile_created = created

            if profile_created:
                profile.credit_balance = 1
                profile.free_transform_used = False
                profile.save()
                logger.info(f"Granted 1 initial credit to new user {email}")
                cache.delete(f'user_profile_{user.id}')

            cache.delete(f'user_profile_{user.id}')

            refresh = RefreshToken.for_user(user)

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
                        'free_transform_used': profile.free_transform_used,
                    }
                }
            })

        except ValueError as e:
            logger.error(f"Invalid Google token: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logger.exception(f"Google authentication error: {str(e)}")
            return Response(
                {'error': f'Authentication failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )