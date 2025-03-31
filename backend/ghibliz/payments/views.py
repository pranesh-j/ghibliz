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



def create_payment_session(request):
    plan_id = request.data.get('plan_id')
    plan = get_object_or_404(PricingPlan, id=plan_id, is_active=True)
    
    # Generate unique payment reference
    reference_code = ''.join(random.choices(string.ASCII_UPPERCASE + string.DIGITS, k=8))
    
    # Create session with 30-minute expiry
    session = PaymentSession.objects.create(
        user=request.user,
        plan=plan,
        amount=plan.price_inr,
        reference_code=reference_code,
        expires_at=timezone.now() + timedelta(minutes=30)
    )
    
    # Only return minimal info to frontend
    return Response({
        'session_id': session.id,
        'reference_code': reference_code,
        'amount': session.amount,
        'plan_name': plan.name,
        'expires_at': session.expires_at
    })


# In payments/views.py - add this view function
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request, session_id):
    # Retrieve session and validate it belongs to user
    session = get_object_or_404(PaymentSession, id=session_id, user=request.user)
    
    # Check if session is expired
    if timezone.now() > session.expires_at:
        session.status = 'expired'
        session.save()
        return Response({"error": "Payment session expired"}, status=400)
    
    # Verify screenshot submission
    if 'screenshot' in request.FILES:
        screenshot = request.FILES['screenshot']
        
        # Validate file type
        if not screenshot.content_type.startswith('image/'):
            return Response({"error": "File must be an image"}, status=400)
            
        # Validate file size (max 5MB)
        if screenshot.size > 5 * 1024 * 1024:
            return Response({"error": "File too large (max 5MB)"}, status=400)
            
        # Create payment record with reference to session
        payment = Payment.objects.create(
            user=request.user,
            amount=session.amount,
            currency='INR',
            credits_purchased=session.plan.credits,
            payment_method='upi',
            screenshot=screenshot,
            verification_method='screenshot',
            reference_code=session.reference_code,  # Store reference code
            status='pending'
        )
        
        # Mark session as completed
        session.status = 'completed'
        session.save()
        
        return Response({"message": "Payment verification submitted"})
    
    # Transaction ID verification
    elif 'transaction_id' in request.data:
        transaction_id = request.data['transaction_id']
        
        # Validate transaction ID format
        if not is_valid_transaction_id(transaction_id):
            return Response({"error": "Invalid transaction ID format"}, status=400)
            
        # Check for duplicate transaction IDs
        if Payment.objects.filter(transaction_id=transaction_id).exists():
            return Response({"error": "This transaction ID has already been used"}, status=400)
            
        # Create payment record with reference to session
        payment = Payment.objects.create(
            user=request.user,
            amount=session.amount,
            currency='INR',
            credits_purchased=session.plan.credits,
            payment_method='upi',
            transaction_id=transaction_id,
            verification_method='transaction_id',
            reference_code=session.reference_code,  # Store reference code
            status='pending'
        )
        
        # Mark session as completed
        session.status = 'completed'
        session.save()
        
        return Response({"message": "Payment verification submitted"})
    
    else:
        return Response({"error": "Screenshot or transaction ID required"}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_session(request):
    """Create a new payment session"""
    plan_id = request.data.get('plan_id')
    
    try:
        plan = PricingPlan.objects.get(id=plan_id, is_active=True)
    except PricingPlan.DoesNotExist:
        return Response(
            {"error": "Invalid or inactive pricing plan"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate unique reference code (8 characters)
    reference_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    while PaymentSession.objects.filter(reference_code=reference_code).exists():
        reference_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    # Create session with 30-minute expiry
    session = PaymentSession.objects.create(
        user=request.user,
        plan=plan,
        amount=plan.price_inr,
        reference_code=reference_code,
        expires_at=timezone.now() + timedelta(minutes=30)
    )
    
    return Response({
        'session_id': session.id,
        'reference_code': reference_code,
        'amount': session.amount,
        'plan_name': plan.name,
        'expires_at': session.expires_at
    })


# Add this to payments/views.py
# In payments/views.py
@api_view(['GET'])
def redirect_to_upi(request, session_id):
    """Securely redirect to UPI app with hidden reference code"""
    try:
        # Get the session - either from authenticated user or from session ID
        if request.user.is_authenticated:
            session = get_object_or_404(PaymentSession, id=session_id, user=request.user)
        else:
            session = get_object_or_404(PaymentSession, id=session_id)
        
        # Check if session is expired
        if timezone.now() > session.expires_at:
            return Response({"error": "Payment session expired"}, status=400)
        
        # UPI ID and other details
        upi_id = "pran.eth@axl"  # Your UPI ID
        merchant_name = "Ghibliz"
        amount = session.amount
        
        # Generate UPI URL with reference code in transaction reference (tr) field
        # This ensures it appears in the payment notes but isn't in the tn parameter
        upi_url = f"upi://pay?pa={upi_id}&pn={merchant_name}&am={amount}&cu=INR&tr={session.reference_code}"
        
        # Perform HTTP redirect to the UPI URL
        return redirect(upi_url)
    except Exception as e:
        return Response({"error": str(e)}, status=500)



# In payments/views.py
@api_view(['GET'])
def get_payment_qr(request, session_id):
    """Generate QR code for payment with hidden reference code"""
    try:
        # Get the session - either from authenticated user or from session ID
        if request.user.is_authenticated:
            session = get_object_or_404(PaymentSession, id=session_id, user=request.user)
        else:
            session = get_object_or_404(PaymentSession, id=session_id)
        
        # Check if session is expired
        if timezone.now() > session.expires_at:
            return Response({"error": "Payment session expired"}, status=400)
        
        # UPI details
        upi_id = "pran.eth@axl"
        merchant_name = "Ghibliz"
        amount = session.amount
        
        # Create UPI link with reference code in transaction reference field
        upi_url = f"upi://pay?pa={upi_id}&pn={merchant_name}&am={amount}&cu=INR&tr={session.reference_code}"
        
        # Generate QR code image
        import qrcode
        from io import BytesIO
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(upi_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to bytes buffer
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        
        # Return the image
        return HttpResponse(buffer, content_type="image/png")
    except Exception as e:
        return Response({"error": str(e)}, status=500)