import logging
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings

from .models import UserCustomStyle
from .style_generator import generate_custom_style

logger = logging.getLogger(__name__)

DAILY_LIMIT = getattr(settings, 'CUSTOM_STYLE_DAILY_LIMIT', 10)


class CustomStyleListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        styles = UserCustomStyle.objects.filter(
            user=request.user, is_active=True
        ).values('id', 'style_key', 'display_name', 'created_at')
        return Response(list(styles))

    def post(self, request):
        description = request.data.get('description', '')
        if not isinstance(description, str):
            return Response(
                {'error': 'description must be a string'},
                status=status.HTTP_400_BAD_REQUEST
            )
        description = description.strip()
        if not description:
            return Response(
                {'error': 'description is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(description) > 500:
            return Response(
                {'error': 'description must be 500 characters or fewer'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Daily limit check
        today = timezone.now().date()
        created_today = UserCustomStyle.objects.filter(
            user=request.user,
            created_at__date=today
        ).count()
        if created_today >= DAILY_LIMIT:
            return Response(
                {'error': f'Daily limit of {DAILY_LIMIT} custom styles reached. Come back tomorrow.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            style_key, display_name, prompt_text = generate_custom_style(description)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Custom style generation failed for user {request.user.username}: {e}")
            return Response(
                {'error': 'Style generation failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        custom_style = UserCustomStyle.objects.create(
            user=request.user,
            display_name=display_name,
            style_key=style_key,
            prompt=prompt_text,
        )
        logger.info(f"Created custom style '{display_name}' for user {request.user.username}")

        return Response(
            {
                'id': custom_style.id,
                'style_key': custom_style.style_key,
                'display_name': custom_style.display_name,
                'created_at': custom_style.created_at,
            },
            status=status.HTTP_201_CREATED
        )


class CustomStyleDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            style = UserCustomStyle.objects.get(pk=pk, user=request.user)
        except UserCustomStyle.DoesNotExist:
            return Response(
                {'error': 'Style not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        style.delete()
        logger.info(f"Deleted custom style {pk} for user {request.user.username}")
        return Response(status=status.HTTP_204_NO_CONTENT)
