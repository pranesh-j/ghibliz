from django.shortcuts import render, get_object_or_404
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from .models import Payment, PricingPlan
from .serializers import PaymentSerializer, PricingPlanSerializer, PaymentVerificationSerializer
from users.models import UserProfile

class CreatePaymentView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create a new payment order"""
        plan_id = request.data.get('plan_id')
        
        try:
            plan = PricingPlan.objects.get(id=plan_id, is_active=True)
        except PricingPlan.DoesNotExist:
            return Response(
                {"error": "Invalid or inactive pricing plan"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create payment record
        payment = Payment.objects.create(
            user=request.user,
            amount=plan.price_inr,
            currency='INR',
            credits_purchased=plan.credits,
            payment_method='upi',
            status='pending'
        )
        
        serializer = PaymentSerializer(payment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class VerifyPaymentView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, payment_id):
        """Verify payment via transaction ID or screenshot"""
        payment = get_object_or_404(Payment, id=payment_id, user=request.user)
        
        # Check if payment is already verified
        if payment.status == 'completed':
            return Response(
                {"error": "Payment already verified"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        serializer = PaymentVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        # Process transaction ID verification
        if 'transaction_id' in serializer.validated_data:
            payment.transaction_id = serializer.validated_data['transaction_id']
            payment.verification_method = 'transaction_id'
            payment.status = 'pending'  # Admin needs to verify
            payment.save()
            
        # Process screenshot verification
        elif 'screenshot' in serializer.validated_data:
            payment.screenshot = serializer.validated_data['screenshot']
            payment.verification_method = 'screenshot'
            payment.status = 'pending'  # Admin needs to verify
            payment.save()
        
        return Response({
            "message": "Payment verification submitted successfully. Your credits will be added once verified.",
            "payment": PaymentSerializer(payment).data
        })
        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pricing_plans(request):
    """Get all active pricing plans"""
    plans = PricingPlan.objects.filter(is_active=True)
    serializer = PricingPlanSerializer(plans, many=True)
    return Response(serializer.data)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_status(request, payment_id):
    """Get payment status"""
    payment = get_object_or_404(Payment, id=payment_id, user=request.user)
    serializer = PaymentSerializer(payment)
    return Response(serializer.data)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_payments(request):
    """Get user payment history"""
    payments = Payment.objects.filter(user=request.user).order_by('-created_at')
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)