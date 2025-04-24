from django.shortcuts import get_object_or_404
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.http import HttpResponse
from django.conf import settings
from django.core.cache import cache
import json
import logging

from .models import Payment, PricingPlan, WebhookEvent
from .serializers import PaymentSerializer, PricingPlanSerializer
from users.models import UserProfile
from .dodo import DodoPaymentsClient, generate_order_id
from .utils import get_user_region

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pricing_plans(request):
    """Get active pricing plans based on user's region with intro offer handling"""
    region = get_user_region(request)
    user_profile = request.user.profile 

    plans_qs = PricingPlan.objects.filter(is_active=True, region=region)

    if not plans_qs.exists() and region != 'GLOBAL':
        plans_qs = PricingPlan.objects.filter(is_active=True, region='GLOBAL')

    if user_profile.intro_offer_redeemed:
        plans_qs = plans_qs.filter(is_intro_offer=False)

    if not plans_qs.exists():
        plans_qs = PricingPlan.objects.filter(is_active=True, region='GLOBAL', is_intro_offer=False)

    serializer = PricingPlanSerializer(plans_qs, many=True)
    return Response(serializer.data)


class CreatePaymentView(views.APIView):
    """Create a payment and get payment link from Dodo Payments"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Create a new payment and generate a payment link.
        
        Args:
            request: The HTTP request object containing plan_id in POST data
            
        Returns:
            Response: Payment details including payment_id, payment_url, etc.
            
        Raises:
            HTTP_400_BAD_REQUEST: If invalid or inactive pricing plan is provided
            HTTP_500_INTERNAL_SERVER_ERROR: If payment creation fails
        """
        plan_id = request.data.get('plan_id')
        user_profile = request.user.profile

        try:
            plan = PricingPlan.objects.get(id=plan_id, is_active=True)
        except PricingPlan.DoesNotExist:
            return Response(
                {"error": "Invalid or inactive pricing plan"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if plan.is_intro_offer and user_profile.intro_offer_redeemed:
            return Response(
                {"error": "You have already redeemed the introductory offer."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order_id = generate_order_id()
        
        if plan.region == 'GLOBAL':
            amount = plan.price_usd
            currency = 'USD'
        else:
            amount = plan.price_inr
            currency = 'INR'

        payment = Payment.objects.create(
            user=request.user,
            amount=amount,
            currency=currency,
            credits_purchased=plan.credits,
            status='pending',
            order_id=order_id,
            metadata={'plan_id': plan.id, 'is_intro': plan.is_intro_offer}
        )
        
        try:
            dodo_client = DodoPaymentsClient()
            payment_data = dodo_client.create_payment(request, plan, request.user)
            
            payment.dodo_payment_id = payment_data.get('payment_id')
            payment.dodo_payment_link = payment_data.get('payment_link')
            payment.save()
            
            return Response({
                'payment_id': payment.id,
                'dodo_payment_id': payment.dodo_payment_id,
                'payment_url': payment.dodo_payment_link,
                'amount': float(payment.amount),
                'credits': payment.credits_purchased,
                'status': payment.status
            })
            
        except Exception as e:
            logger.error(f"Payment creation failed: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response status: {e.response.status_code}, Response text: {e.response.text}")
            payment.status = 'failed'
            payment.save()
            return Response(
                {"error": "Failed to create payment. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_payment_status(request, payment_id):
    """Check the status of a payment"""
    payment = get_object_or_404(Payment, id=payment_id, user=request.user)
    
    if payment.status in ['completed', 'failed', 'cancelled']:
        return Response({
            'payment_id': payment.id,
            'status': payment.status,
            'credits_purchased': payment.credits_purchased
        })
    
    try:
        dodo_client = DodoPaymentsClient()
        if not payment.dodo_payment_id:
            logger.error(f"Payment {payment.id} is missing dodo_payment_id.")
            return Response(
                {"error": "Payment record is incomplete (missing Dodo ID)."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        is_test_mode = settings.DODO_TEST_MODE
        referer = request.META.get('HTTP_REFERER', '')
        came_from_success_page = referer.find('success') >= 0

        logger.info(f"check_payment_status called for payment {payment.id}. TestMode: {is_test_mode}, Referer: '{referer}', CameFromSuccess: {came_from_success_page}")

        if is_test_mode and came_from_success_page:
            logger.info(f"Test mode success condition MET for payment {payment.id}.")
            if payment.status != 'completed':
                payment.status = 'completed'
                payment.save()

                profile = request.user.profile
                profile.credit_balance += payment.credits_purchased
                if payment.metadata.get('is_intro'):
                    profile.intro_offer_redeemed = True
                    logger.info(f"Marked introductory offer as redeemed for user {request.user.id}")
                profile.save()
                cache.delete(f'user_profile_{request.user.id}')
                logger.info(f"Test mode: Added {payment.credits_purchased} credits to user {request.user.id}. New balance: {profile.credit_balance}")

            return Response({
                'payment_id': payment.id,
                'status': 'completed',
                'credits_purchased': payment.credits_purchased,
                'credit_balance': request.user.profile.credit_balance,
                'message': 'Payment completed (test mode)'
            })
        
        logger.info(f"Test mode success condition NOT MET for payment {payment.id}.")
        status_data = dodo_client.get_payment_status(payment.dodo_payment_id)

        if status_data is None:
            logger.error(f"Received None status_data for Dodo payment ID {payment.dodo_payment_id}")
            return Response({
                'payment_id': payment.id,
                'status': payment.status,
                'message': 'Could not retrieve status from payment provider.'
            })

        dodo_status_value = status_data.get('status')
        if dodo_status_value is None:
            logger.info(f"Dodo payment {payment.dodo_payment_id} reported status as null. Assuming pending/processing.")
            return Response({
                'payment_id': payment.id,
                'status': 'processing',
                'message': 'Payment status is currently initializing.'
            })

        dodo_status = dodo_status_value.lower()

        if dodo_status == 'succeeded':
            if payment.status != 'completed':
                payment.status = 'completed'
                payment.save()

                profile = request.user.profile
                profile.credit_balance += payment.credits_purchased
                if payment.metadata.get('is_intro'):
                    profile.intro_offer_redeemed = True
                    logger.info(f"Marked introductory offer as redeemed for user {request.user.id}")
                profile.save()
                cache.delete(f'user_profile_{request.user.id}')
                logger.info(f"Payment {payment.id} completed via status check. Added {payment.credits_purchased} credits to user {request.user.id}. New balance: {profile.credit_balance}")

            return Response({
                'payment_id': payment.id,
                'status': 'completed',
                'credits_purchased': payment.credits_purchased,
                'credit_balance': request.user.profile.credit_balance
            })

        elif dodo_status == 'failed':
            if payment.status != 'failed':
                payment.status = 'failed'
                payment.save()
                logger.info(f"Payment {payment.id} failed via status check.")
            return Response({
                'payment_id': payment.id,
                'status': 'failed',
                'message': 'Payment was unsuccessful'
            })

        elif dodo_status == 'cancelled':
            if payment.status != 'cancelled':
                payment.status = 'cancelled'
                payment.save()
                logger.info(f"Payment {payment.id} cancelled via status check.")
            return Response({
                'payment_id': payment.id,
                'status': 'cancelled',
                'message': 'Payment was cancelled'
            })

        else:
            logger.info(f"Dodo payment {payment.dodo_payment_id} status: {dodo_status}. Treating as processing.")
            return Response({
                'payment_id': payment.id,
                'status': 'processing',
                'message': f'Payment status from provider: {dodo_status}'
            })
            
    except Exception as e:
        logger.exception(f"Error checking payment status for payment {payment.id} (Dodo ID: {payment.dodo_payment_id}): {str(e)}")
        return Response(
            {"error": "Failed to check payment status due to an internal error."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@require_POST
def webhook_handler(request):
    """Handle webhooks from Dodo Payments"""
    logger.info("Webhook handler received request.")
    logger.info(f"Webhook Headers: {request.headers}")
    logger.info(f"Webhook Body (raw): {request.body.decode('utf-8')}")

    webhook_id = request.headers.get('webhook-id')
    webhook_signature = request.headers.get('webhook-signature')
    webhook_timestamp = request.headers.get('webhook-timestamp')
    
    payload = request.body
    
    client = DodoPaymentsClient()
    if not client.verify_webhook_signature(payload, webhook_signature, webhook_id, webhook_timestamp):
        logger.warning("Invalid webhook signature")
        return HttpResponse(status=401)
    
    try:
        webhook_data = json.loads(payload)
        
        event_id = webhook_id
        event_type = webhook_data.get('type')
        
        if WebhookEvent.objects.filter(event_id=event_id).exists():
            logger.info(f"Webhook event {event_id} already processed")
            return HttpResponse(status=200)
        
        payment_data = webhook_data.get('data', {})
        dodo_payment_id = payment_data.get('payment_id')
        
        try:
            payment = Payment.objects.get(dodo_payment_id=dodo_payment_id)
            
            webhook_event = WebhookEvent.objects.create(
                event_id=event_id,
                event_type=event_type,
                payment=payment,
                payload=webhook_data,
                processed=False
            )
            
            if event_type == 'payment.succeeded':
                if payment.status != 'completed':
                    payment.status = 'completed'
                    payment.save()
                    
                    user = payment.user
                    profile = user.profile
                    profile.credit_balance += payment.credits_purchased
                    if payment.metadata.get('is_intro'):
                        profile.intro_offer_redeemed = True
                        logger.info(f"Marked introductory offer as redeemed for user {user.id}")
                    profile.save()
                    cache.delete(f'user_profile_{user.id}')
                    
                    logger.info(f"Added {payment.credits_purchased} credits to user {user.username}")
                
            elif event_type == 'payment.failed':
                payment.status = 'failed'
                payment.save()
                
            elif event_type == 'payment.cancelled':
                payment.status = 'cancelled'
                payment.save()
            
            webhook_event.processed = True
            webhook_event.save()
            
            return HttpResponse(status=200)
            
        except Payment.DoesNotExist:
            logger.warning(f"Payment with Dodo ID {dodo_payment_id} not found")
            return HttpResponse(status=404)
            
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return HttpResponse(status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_payments(request):
    """Get payment history for current user"""
    payments = Payment.objects.filter(user=request.user).order_by('-created_at')
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)