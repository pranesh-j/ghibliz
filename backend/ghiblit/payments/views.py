# backend/ghiblit/payments/views.py

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

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pricing_plans(request):
    """Get active pricing plans"""
    plans = PricingPlan.objects.filter(is_active=True)
    serializer = PricingPlanSerializer(plans, many=True)
    return Response(serializer.data)

class CreatePaymentView(views.APIView):
    """Create a payment and get payment link from Dodo Payments"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        plan_id = request.data.get('plan_id')
        
        try:
            plan = PricingPlan.objects.get(id=plan_id, is_active=True)
        except PricingPlan.DoesNotExist:
            return Response(
                {"error": "Invalid or inactive pricing plan"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate unique order ID
        order_id = generate_order_id()
        
        # Create a payment record in our database
        payment = Payment.objects.create(
            user=request.user,
            amount=plan.price_inr,
            currency='INR',
            credits_purchased=plan.credits,
            status='pending',
            order_id=order_id
        )
        
        # Call Dodo API to create payment
        try:
            dodo_client = DodoPaymentsClient()
            payment_data = dodo_client.create_payment(plan, request.user)
            
            # Update our payment record with Dodo data
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
    
    # If payment is already in final state, just return
    if payment.status in ['completed', 'failed', 'cancelled']:
        return Response({
            'payment_id': payment.id,
            'status': payment.status,
            'credits_purchased': payment.credits_purchased
        })
    
    # Otherwise, check with Dodo API
    try:
        dodo_client = DodoPaymentsClient()
        status_data = dodo_client.get_payment_status(payment.dodo_payment_id)
        
        # Map Dodo status to our status
        dodo_status = status_data.get('status', '').lower()
        
        if dodo_status == 'succeeded':
            # Payment successful - update status and add credits
            payment.status = 'completed'
            payment.save()
            
            # Add credits to user's account
            profile = request.user.profile
            profile.credit_balance += payment.credits_purchased
            profile.save()
            
            # Clear cache
            cache.delete(f'user_profile_{request.user.id}')
            
            return Response({
                'payment_id': payment.id,
                'status': 'completed',
                'credits_purchased': payment.credits_purchased,
                'credit_balance': profile.credit_balance
            })
            
        elif dodo_status == 'failed':
            payment.status = 'failed'
            payment.save()
            
            return Response({
                'payment_id': payment.id,
                'status': 'failed',
                'message': 'Payment was unsuccessful'
            })
            
        elif dodo_status == 'cancelled':
            payment.status = 'cancelled'
            payment.save()
            
            return Response({
                'payment_id': payment.id,
                'status': 'cancelled',
                'message': 'Payment was cancelled'
            })
            
        else:
            # Still processing
            return Response({
                'payment_id': payment.id,
                'status': 'processing',
                'message': 'Payment is still being processed'
            })
            
    except Exception as e:
        logger.error(f"Error checking payment status: {str(e)}")
        return Response(
            {"error": "Failed to check payment status"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@csrf_exempt
@require_POST
def webhook_handler(request):
    """Handle webhooks from Dodo Payments"""
    # Get the webhook headers for verification
    webhook_id = request.headers.get('webhook-id')
    webhook_signature = request.headers.get('webhook-signature')
    webhook_timestamp = request.headers.get('webhook-timestamp')
    
    # Get the raw payload
    payload = request.body
    
    # Verify webhook signature
    client = DodoPaymentsClient()
    if not client.verify_webhook_signature(payload, webhook_signature, webhook_id, webhook_timestamp):
        logger.warning("Invalid webhook signature")
        return HttpResponse(status=401)
    
    try:
        # Parse the JSON payload
        webhook_data = json.loads(payload)
        
        # Extract event information
        event_id = webhook_id
        event_type = webhook_data.get('type')
        
        # Check if we've already processed this event
        if WebhookEvent.objects.filter(event_id=event_id).exists():
            logger.info(f"Webhook event {event_id} already processed")
            return HttpResponse(status=200)
        
        # Get payment data
        payment_data = webhook_data.get('data', {})
        dodo_payment_id = payment_data.get('payment_id')
        
        # Find corresponding payment in our database
        try:
            payment = Payment.objects.get(dodo_payment_id=dodo_payment_id)
            
            # Create webhook event record
            webhook_event = WebhookEvent.objects.create(
                event_id=event_id,
                event_type=event_type,
                payment=payment,
                payload=webhook_data,
                processed=False
            )
            
            # Process based on event type
            if event_type == 'payment.succeeded':
                if payment.status != 'completed':
                    payment.status = 'completed'
                    payment.save()
                    
                    # Add credits to user
                    user = payment.user
                    profile = user.profile
                    profile.credit_balance += payment.credits_purchased
                    profile.save()
                    
                    # Clear cache
                    cache.delete(f'user_profile_{user.id}')
                    
                    logger.info(f"Added {payment.credits_purchased} credits to user {user.username}")
                
            elif event_type == 'payment.failed':
                payment.status = 'failed'
                payment.save()
                
            elif event_type == 'payment.cancelled':
                payment.status = 'cancelled'
                payment.save()
            
            # Mark webhook as processed
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