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
        if not payment.dodo_payment_id:
            logger.error(f"Payment {payment.id} is missing dodo_payment_id.")
            return Response(
                {"error": "Payment record is incomplete (missing Dodo ID)."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        status_data = dodo_client.get_payment_status(payment.dodo_payment_id)

        if status_data is None:
            logger.error(f"Received None status_data for Dodo payment ID {payment.dodo_payment_id}")
            # Return current status, indicating check failed
            return Response({
                'payment_id': payment.id,
                'status': payment.status, # Keep current status
                'message': 'Could not retrieve status from payment provider.'
            })

        # Get the status value from Dodo response
        dodo_status_value = status_data.get('status') # Get the value, which might be None

        # **** Handle the None case explicitly ****
        if dodo_status_value is None:
            logger.info(f"Dodo payment {payment.dodo_payment_id} reported status as null. Assuming pending/processing.")
            # Treat null status as still processing
            return Response({
                'payment_id': payment.id,
                'status': 'processing', # Or keep payment.status if preferred
                'message': 'Payment status is currently initializing.'
            })

        # If not None, convert to lower case for comparison
        dodo_status = dodo_status_value.lower() # Now safe to call .lower()

        if dodo_status == 'succeeded':
            if payment.status != 'completed':
                payment.status = 'completed'
                payment.save()

                profile = request.user.profile
                profile.credit_balance += payment.credits_purchased
                profile.save()
                cache.delete(f'user_profile_{request.user.id}')
                logger.info(f"Payment {payment.id} completed via status check. Added {payment.credits_purchased} credits to user {request.user.id}. New balance: {profile.credit_balance}")

            return Response({
                'payment_id': payment.id,
                'status': 'completed',
                'credits_purchased': payment.credits_purchased,
                'credit_balance': request.user.profile.credit_balance # Return updated balance
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

        else: # Still processing or other unknown status
            logger.info(f"Dodo payment {payment.dodo_payment_id} status: {dodo_status}. Treating as processing.")
            # Optionally update payment.status to 'processing' if it was 'pending'
            # if payment.status == 'pending':
            #    payment.status = 'processing'
            #    payment.save()
            return Response({
                'payment_id': payment.id,
                'status': 'processing', # Return consistent processing status
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
                    
                    # Add credits to user's account
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