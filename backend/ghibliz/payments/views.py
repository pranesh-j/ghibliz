from django.shortcuts import render, get_object_or_404
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from .models import Payment, PricingPlan, PaymentSession
from .serializers import PaymentSerializer, PricingPlanSerializer, PaymentVerificationSerializer
from users.models import UserProfile
import random
import string
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


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


from PIL import Image
import pytesseract
import io
import logging

logger = logging.getLogger(__name__)

import requests
import json
from datetime import datetime

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request, session_id):
    """Verify payment using Gemini AI to extract and validate payment details"""
    # Get the session - must belong to current user
    session = get_object_or_404(PaymentSession, id=session_id, user=request.user)
    reference_code = session.reference_code
    
    # Check if session is expired
    if timezone.now() > session.expires_at:
        session.status = 'expired'
        session.save()
        return Response({"error": "Payment session expired"}, status=400)
    
    # Check for screenshot
    if 'screenshot' not in request.FILES:
        return Response({"error": "Screenshot required for verification"}, status=400)
        
    screenshot = request.FILES['screenshot']
    
    # Validate file type
    if not screenshot.content_type.startswith('image/'):
        return Response({"error": "File must be an image"}, status=400)
        
    # Validate file size (max 5MB)
    if screenshot.size > 5 * 1024 * 1024:
        return Response({"error": "File too large (max 5MB)"}, status=400)
    
    try:
        # Call Gemini API to extract information from screenshot
        extracted_data = extract_payment_info_from_screenshot(screenshot, reference_code, session.amount)
        
        if not extracted_data['success']:
            return Response({"error": extracted_data['error']}, status=400)
        
        # Check if payment details are valid
        payment_details = extracted_data['data']
        
        # Print all verification results for debugging
        print(f"Verification details: reference={payment_details.get('reference_code_matches')}, "
              f"amount={payment_details.get('amount_matches')}, "
              f"success={payment_details.get('payment_successful')}")
        
        # 1. Verify reference code matches
        if not payment_details.get('reference_code_matches', False):
            return Response({
                "error": "Reference code in the payment doesn't match. Please ensure you entered the exact reference code."
            }, status=400)
            
        # 2. Verify amount matches
        if not payment_details.get('amount_matches', False):
            return Response({
                "error": "Payment amount doesn't match the required amount. Please ensure you paid the exact amount."
            }, status=400)
            
        # 3. Verify payment was successful
        if not payment_details.get('payment_successful', False):
            return Response({
                "error": "The payment appears to have failed or is pending. Please provide a screenshot of a successful payment."
            }, status=400)
        
        # Create payment record
        payment = Payment.objects.create(
            user=request.user,
            amount=session.amount,
            currency='INR',
            credits_purchased=session.plan.credits,
            payment_method='upi',
            screenshot=screenshot,
            verification_method='screenshot',
            reference_code=session.reference_code,
            status='completed',
            transaction_id=payment_details.get('transaction_id', '')
        )
        
        # Add credits to user's account
        profile = request.user.profile
        profile.credit_balance += session.plan.credits
        profile.save()
        
        # Mark session as completed
        session.status = 'completed'
        session.save()
        
        return Response({
            "message": "Payment verified successfully", 
            "credits_added": session.plan.credits,
            "total_credits": profile.credit_balance
        })
        
    except Exception as e:
        print(f"Error processing payment: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({
            "error": "We encountered a problem processing your payment verification. Please try again or contact support."
        }, status=500)

def extract_payment_info_from_screenshot(screenshot, expected_reference_code, expected_amount):
    """
    Use Gemini API to extract payment information from screenshot
    """
    try:
        # Convert image to base64
        import base64
        screenshot_base64 = base64.b64encode(screenshot.read()).decode('utf-8')
        
        # Gemini API key and endpoint
        api_key = settings.GEMINI_API_KEY
        api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"
        
        # Create specific prompt for payment verification
        prompt = f"""
        Analyze this payment screenshot and extract the following information:
        1. Transaction amount (exact amount in numbers with currency symbol)
        2. Payment timestamp (date and time)
        3. Transaction ID or Reference number
        4. UPI ID of sender (if available)
        5. UPI ID of recipient (if available)
        6. Transaction note or remarks (this is the most important a 8-digit alphanumeric reference code from the payment screenshot. The reference code should consist of uppercase letters and digits)
        7. Payment status (success/failure)
        
        Compare these details with:
        - Expected reference code: '{expected_reference_code}'
        - Expected amount: ₹{expected_amount}
        - Expected recipient: 'pran.eth@axl'
        
        Format your response as a JSON object with these fields.
        """
        
        # Call Gemini API
        request_data = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": screenshot.content_type,
                                "data": screenshot_base64
                            }
                        }
                    ]
                }
            ]
        }
        
        response = requests.post(
            f"{api_url}?key={api_key}",
            headers={"Content-Type": "application/json"},
            data=json.dumps(request_data)
        )
        
        if response.status_code != 200:
            print(f"Gemini API error: {response.text}")
            return {
                'success': False,
                'error': 'Unable to process payment screenshot. Please try again or contact support.'
            }
        
        # Extract text from response
        response_data = response.json()
        content = response_data.get('candidates', [{}])[0].get('content', {})
        text_parts = [part.get('text', '') for part in content.get('parts', []) if 'text' in part]
        text = ''.join(text_parts)
        
        print("===== GEMINI FULL RESPONSE =====")
        print(text)
        print("================================")
        
        # Try to extract JSON data from response
        import re
        json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if json_match:
            json_text = json_match.group(1)
        else:
            json_text = text
            
        try:
            extracted_data = json.loads(json_text)
            print("===== EXTRACTED DATA =====")
            print(json.dumps(extracted_data, indent=2))
            print("==========================")
            
        except Exception as json_err:
            print(f"JSON parsing error: {str(json_err)}")
            # Handle parsing failure as before
            json_pattern = r'(\{.*\})'
            json_match = re.search(json_pattern, text, re.DOTALL)
            if json_match:
                try:
                    extracted_data = json.loads(json_match.group(1))
                except:
                    return {
                        'success': False,
                        'error': 'Unable to extract payment details from screenshot. Please ensure the entire payment receipt is visible.'
                    }
            else:
                return {
                    'success': False,
                    'error': 'Unable to extract payment details from screenshot. Please ensure the entire payment receipt is visible.'
                }
        
        # Get transaction note
        transaction_note = (
            extracted_data.get('transaction_note') or 
            extracted_data.get('Transaction note') or 
            extracted_data.get('transaction_note_or_remarks') or
            extracted_data.get('Transaction note or remarks') or
            ''
        )
        
        print(f"Looking for reference code: {expected_reference_code}")
        print(f"Found transaction note: {transaction_note}")
        
        # Check reference code match
        reference_code_matches = (expected_reference_code == transaction_note) or (expected_reference_code in transaction_note)
        
        # Also check if Gemini directly answered about reference match
        direct_match_keys = [
            'does_transaction_note_match',
            'is_transaction_note_matching',
            'reference_code_matches',
            f'is_transaction_note_{expected_reference_code}'
        ]
        
        direct_match = False
        for key in direct_match_keys:
            if key in extracted_data:
                direct_match = extracted_data[key]
                if direct_match:
                    break
        
        # Final reference match
        final_reference_match = reference_code_matches or direct_match
        print(f"Reference code match: {reference_code_matches}")
        print(f"Direct match from Gemini: {direct_match}")
        
        # Get amount 
        amount_str = (
            extracted_data.get('transaction_amount') or
            extracted_data.get('Transaction amount') or
            ''
        )
        
        # FIXED: Improved amount comparison logic
        # Normalize both the expected and extracted amounts for comparison
        def normalize_amount(amount):
            # Remove currency symbols, spaces and convert to string
            return str(amount).replace('₹', '').replace(' ', '').strip()
        
        extracted_amount = normalize_amount(amount_str)
        normalized_expected = normalize_amount(expected_amount)
        
        print(f"Expected amount: {expected_amount}, Normalized: {normalized_expected}")
        print(f"Extracted amount: {amount_str}, Normalized: {extracted_amount}")
        
        # Check if amounts match
        amount_matches = extracted_amount == normalized_expected
        
        # Also check Gemini's direct answer about amount
        direct_amount_match = extracted_data.get('does_amount_match', False)
        
        # Final amount match
        final_amount_match = amount_matches or direct_amount_match
        print(f"Amount match: {amount_matches}")
        print(f"Direct amount match from Gemini: {direct_amount_match}")
        print(f"Final amount match: {final_amount_match}")
        
        # Check payment status
        payment_successful = (
            'success' in (extracted_data.get('payment_status', '') or '').lower() or
            extracted_data.get('is_payment_successful', False)
        )
        
        # Prepare verification results
        verification_result = {
            'success': True,
            'data': {
                'transaction_id': extracted_data.get('transaction_id') or extracted_data.get('Transaction ID') or '',
                'amount': amount_str,
                'timestamp': extracted_data.get('payment_timestamp') or extracted_data.get('Payment timestamp') or '',
                'sender_upi': extracted_data.get('upi_id_sender') or extracted_data.get('UPI ID of sender') or '',
                'reference_code_matches': final_reference_match,
                'amount_matches': final_amount_match,
                'timestamp_valid': True,  # Simplified for now
                'payment_successful': payment_successful
            }
        }
        
        print("===== VERIFICATION RESULT =====")
        print(json.dumps(verification_result, indent=2))
        print("==============================")
        
        return verification_result
    
    except Exception as e:
        print(f"Error in Gemini API processing: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': 'We encountered a problem analyzing your payment screenshot. Please try again or contact support.'
        }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_session(request):
    """Create a secure payment session without exposing reference code"""
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
    
    # UPI ID and other details
    upi_id = "pran.eth@axl"
    merchant_name = "Ghibliz"
    
    # Create session with 7-minute expiry (changed from 5 minutes)
    session = PaymentSession.objects.create(
        user=request.user,
        plan=plan,
        amount=plan.price_inr,
        reference_code=reference_code,
        expires_at=timezone.now() + timedelta(minutes=7)
    )
    
    # Generate UPI deep link with the reference code (hidden from frontend)
    upi_link = f"upi://pay?pa={upi_id}&pn={merchant_name}&am={session.amount}&cu=INR&tn={reference_code}"
    
    # Generate QR code for the UPI link
    import qrcode
    import base64
    from io import BytesIO
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(upi_link)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR code to bytes buffer and convert to base64 for embedding
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Return minimal info WITHOUT reference_code but WITH the UPI link and QR
    return Response({
        'session_id': session.id,
        'amount': session.amount,
        'plan_name': plan.name,
        'expires_at': session.expires_at,
        'upi_link': upi_link,
        'qr_code_data': f"data:image/png;base64,{qr_code_base64}"
    })



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
        upi_id = "pran.eth@axl"
        merchant_name = "Ghibliz"
        amount = session.amount
        
        # Generate UPI URL with reference code in transaction note (tn) field
        upi_url = f"upi://pay?pa={upi_id}&pn={merchant_name}&am={amount}&cu=INR&tn={session.reference_code}"
        
        # Perform HTTP redirect to the UPI URL
        return redirect(upi_url)
    except Exception as e:
        logger.error(f"UPI redirect error for session {session_id}: {str(e)}")
        return Response({"error": "Failed to process payment link"}, status=500)

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