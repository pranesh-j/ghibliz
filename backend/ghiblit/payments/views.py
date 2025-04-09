from django.shortcuts import render, get_object_or_404, redirect
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
from django.http import HttpResponse
from django.views.decorators.cache import cache_page
from django.core.cache import cache

class CreatePaymentView(views.APIView):
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
        payment = get_object_or_404(Payment, id=payment_id, user=request.user)
        
        if payment.status == 'completed':
            return Response(
                {"error": "Payment already verified"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        serializer = PaymentVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        if 'transaction_id' in serializer.validated_data:
            payment.transaction_id = serializer.validated_data['transaction_id']
            payment.verification_method = 'transaction_id'
            payment.status = 'pending'
            payment.save()
            
        elif 'screenshot' in serializer.validated_data:
            payment.screenshot = serializer.validated_data['screenshot']
            payment.verification_method = 'screenshot'
            payment.status = 'pending'
            payment.save()
        
        return Response({
            "message": "Payment verification submitted successfully. Your credits will be added once verified.",
            "payment": PaymentSerializer(payment).data
        })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cache_page(60 * 15)
def get_pricing_plans(request):
    plans = PricingPlan.objects.filter(is_active=True)
    serializer = PricingPlanSerializer(plans, many=True)
    return Response(serializer.data)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_status(request, payment_id):
    payment = get_object_or_404(Payment, id=payment_id, user=request.user)
    serializer = PaymentSerializer(payment)
    return Response(serializer.data)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_payments(request):
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
    session = get_object_or_404(PaymentSession, id=session_id, user=request.user)
    reference_code = session.reference_code
    
    if timezone.now() > session.expires_at:
        session.status = 'expired'
        session.save()
        return Response({"error": "Payment session expired"}, status=400)
    
    if 'screenshot' not in request.FILES:
        return Response({"error": "Screenshot required for verification"}, status=400)
        
    screenshot = request.FILES['screenshot']
    
    if not screenshot.content_type.startswith('image/'):
        return Response({"error": "File must be an image"}, status=400)
        
    if screenshot.size > 5 * 1024 * 1024:
        return Response({"error": "File too large (max 5MB)"}, status=400)
    
    try:
        extracted_data = extract_payment_info_from_screenshot(
            screenshot, 
            reference_code, 
            session.amount,
            session.created_at
        )
        
        if not extracted_data['success']:
            return Response({"error": extracted_data['error']}, status=400)
        
        payment_details = extracted_data['data']
        
        verification_score = 0
        required_score = 3

        if not payment_details.get('amount_matches', False):
            return Response({"error": "Payment amount doesn't match the required amount. Please ensure you paid the exact amount."}, status=400)
            
        if not payment_details.get('payment_successful', False):
            return Response({"error": "The payment appears to have failed or is pending. Please provide a screenshot of a successful payment."}, status=400)

        if payment_details.get('reference_code_matches', False):
            verification_score += 1

        if payment_details.get('timestamp_valid', False):
            verification_score += 1

        if payment_details.get('transaction_id', ''):
            verification_score += 1
            
        if payment_details.get('recipient_verified', False):
            verification_score += 1
            
        if verification_score < required_score:
            return Response({
                "error": "Payment verification failed. Make sure your screenshot shows the complete payment confirmation."
            }, status=400)

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
        
        profile = request.user.profile
        profile.credit_balance += session.plan.credits
        profile.save()

        cache.delete(f'user_profile_{request.user.id}')
        
        session.status = 'completed'
        session.save()
        
        return Response({
            "message": "Payment verified successfully", 
            "credits_added": session.plan.credits,
            "total_credits": profile.credit_balance
        })
        
    except Exception as e:
        return Response({
            "error": "We encountered a problem processing your payment verification. Please try again or contact support."
        }, status=500)


def extract_payment_info_from_screenshot(screenshot, expected_reference_code, expected_amount, session_created_at=None):
    try:
        import base64
        screenshot_base64 = base64.b64encode(screenshot.read()).decode('utf-8')
        
        api_key = settings.GEMINI_API_KEY
        api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"
        
        prompt = f"""
        Analyze this payment screenshot and extract the following information:
        1. Transaction amount (exact amount in numbers with currency symbol)
        2. Payment timestamp (date and time)
        3. Transaction ID or Reference number
        4. UPI ID of sender (if available)
        5. UPI ID of recipient (if available)
        6. Name of recipient (if available)
        7. Transaction note or remarks (this is the most important a 8-digit alphanumeric reference code from the payment screenshot. The reference code should consist of uppercase letters and digits)
        8. Payment status (success/failure)
        
        Compare these details with:
        - Expected reference code: '{expected_reference_code}'
        - Expected amount: ₹{expected_amount}
        - Expected recipient UPI ID: 'pran.eth@axl'
        - Expected recipient name: 'Pranesh Jahagirdar'
        
        Format your response as a JSON object with these fields.
        """
        
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
            return {
                'success': False,
                'error': 'Unable to process payment screenshot. Please try again or contact support.'
            }
        
        response_data = response.json()
        content = response_data.get('candidates', [{}])[0].get('content', {})
        text_parts = [part.get('text', '') for part in content.get('parts', []) if 'text' in part]
        text = ''.join(text_parts)
        
        import re
        json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if json_match:
            json_text = json_match.group(1)
        else:
            json_text = text
            
        try:
            extracted_data = json.loads(json_text)
        except Exception as json_err:
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
        
        transaction_note = (
            extracted_data.get('transaction_note') or 
            extracted_data.get('Transaction note') or 
            extracted_data.get('transaction_note_or_remarks') or
            extracted_data.get('Transaction note or remarks') or
            ''
        )
        
        reference_code_matches = (expected_reference_code == transaction_note) or (expected_reference_code in transaction_note)
        
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
        
        final_reference_match = reference_code_matches or direct_match
        
        amount_str = (
            extracted_data.get('transaction_amount') or
            extracted_data.get('Transaction amount') or
            ''
        )
        
        def normalize_amount(amount):
            cleaned = str(amount).replace('₹', '').replace(' ', '').strip()
            try:
                return float(cleaned)
            except (ValueError, TypeError):
                return cleaned
        
        extracted_amount = normalize_amount(amount_str)
        normalized_expected = normalize_amount(expected_amount)
        
        try:
            amount_matches = abs(float(extracted_amount) - float(normalized_expected)) < 0.01
        except (ValueError, TypeError):
            amount_matches = str(extracted_amount) == str(normalized_expected)
        
        direct_amount_match = extracted_data.get('does_amount_match', False)
        
        final_amount_match = amount_matches or direct_amount_match
        
        recipient_upi = (
            extracted_data.get('upi_id_recipient') or 
            extracted_data.get('UPI ID of recipient') or 
            ''
        )
        recipient_name = (
            extracted_data.get('recipient_name') or
            extracted_data.get('Name of recipient') or
            ''
        )

        recipient_upi_match = 'pran.eth@axl' in recipient_upi.lower() if recipient_upi else False
        recipient_name_match = 'pranesh' in recipient_name.lower() if recipient_name else False

        recipient_verified = recipient_upi_match or recipient_name_match

        recipient_match_keys = [
            'recipient_match',
            'does_recipient_match',
            'is_recipient_matching'
        ]

        direct_recipient_match = False
        for key in recipient_match_keys:
            if key in extracted_data:
                direct_recipient_match = extracted_data[key]
                if direct_recipient_match:
                    break
                
        if 'comparison' in extracted_data and 'recipient_match' in extracted_data['comparison']:
            direct_recipient_match = direct_recipient_match or extracted_data['comparison']['recipient_match']
            
        if 'comparison' in extracted_data and 'recipient_name_match' in extracted_data['comparison']:
            direct_recipient_match = direct_recipient_match or extracted_data['comparison']['recipient_name_match']

        final_recipient_verified = recipient_verified or direct_recipient_match
        
        payment_successful = (
            'success' in (extracted_data.get('payment_status', '') or '').lower() or
            extracted_data.get('is_payment_successful', False)
        )
        
        def parse_payment_timestamp(timestamp_str, session_created_at):
            try:
                import re
                from datetime import datetime
                from django.utils import timezone
                import pytz
                
                cleaned = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', timestamp_str)
                
                date_match = re.search(r'(\d+)\s+([A-Za-z]+)[,]?\s+(\d{4})', cleaned)
                time_match = re.search(r'(\d{1,2}):(\d{2})(?:\s*(APM))?', cleaned)
                
                if date_match and time_match:
                    day, month, year = date_match.groups()
                    hour, minute, ampm = time_match.groups()
                    
                    month_map = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                                'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
                    month_num = month_map.get(month.lower()[:3], 1)
                    
                    hour = int(hour)
                    if ampm and ampm.upper() == 'PM' and hour < 12:
                        hour += 12
                    if ampm and ampm.upper() == 'AM' and hour == 12:
                        hour = 0
                        
                    payment_time_naive = datetime(int(year), month_num, int(day), hour, int(minute))
                    
                    ist = pytz.timezone('Asia/Kolkata')
                    payment_time_ist = ist.localize(payment_time_naive)
                    
                    payment_time = payment_time_ist.astimezone(pytz.UTC)
                    
                    time_window_start = session_created_at - timezone.timedelta(hours=12)
                    time_window_end = timezone.now() + timezone.timedelta(hours=12)
                    
                    time_valid = (payment_time >= time_window_start and 
                                payment_time <= time_window_end)
                    
                    return time_valid
                
                return False
            except Exception as e:
                return False
        
        timestamp_str = extracted_data.get('payment_timestamp') or extracted_data.get('Payment timestamp') or ''
        timestamp_valid = parse_payment_timestamp(timestamp_str, session_created_at) if timestamp_str and session_created_at else False
        
        if 'comparison' in extracted_data and 'timestamp_valid' in extracted_data['comparison']:
            timestamp_valid = timestamp_valid or extracted_data['comparison']['timestamp_valid']
            
        verification_result = {
            'success': True,
            'data': {
                'transaction_id': extracted_data.get('transaction_id') or extracted_data.get('Transaction ID') or '',
                'amount': amount_str,
                'timestamp': timestamp_str,
                'sender_upi': extracted_data.get('upi_id_sender') or extracted_data.get('UPI ID of sender') or '',
                'recipient_upi': recipient_upi,
                'recipient_name': recipient_name,
                'reference_code_matches': final_reference_match,
                'amount_matches': final_amount_match,
                'timestamp_valid': timestamp_valid,
                'recipient_verified': final_recipient_verified,
                'payment_successful': payment_successful,
                'comparison': extracted_data.get('comparison', {})
            }
        }
        
        return verification_result
    
    except Exception as e:
        return {
            'success': False,
            'error': 'We encountered a problem analyzing your payment screenshot. Please try again or contact support.'
        }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_session(request):
    plan_id = request.data.get('plan_id')
    
    logger.info(f"Creating payment session for plan_id: {plan_id}")
    
    try:
        plan_id = int(plan_id)
    except (TypeError, ValueError):
        logger.error(f"Invalid plan_id format: {plan_id}")
        return Response({"error": "Invalid plan ID"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        plan = PricingPlan.objects.get(id=plan_id, is_active=True)
        logger.info(f"Found active plan in database: {plan.id} - {plan.name}")
    except PricingPlan.DoesNotExist:
        logger.error(f"Plan {plan_id} not found or inactive")
        return Response(
            {"error": "Selected pricing plan not found or is inactive"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    char_set = ''.join([c for c in string.ascii_uppercase + string.digits if c not in 'O0I1'])
    
    reference_code = ''.join(random.choices(char_set, k=8))
    while PaymentSession.objects.filter(reference_code=reference_code).exists():
        reference_code = ''.join(random.choices(char_set, k=8))
    
    upi_id = "pran.eth@axl"
    merchant_name = "Ghiblit"
    
    amount = plan.price_inr
    logger.info(f"Using price from database: {amount}")
    
    try:
        session = PaymentSession.objects.create(
            user=request.user,
            plan=plan,
            amount=amount,
            reference_code=reference_code,
            expires_at=timezone.now() + timedelta(minutes=7)
        )
        logger.info(f"Created session {session.id} with amount {session.amount}")
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        return Response(
            {"error": "Failed to create payment session"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    upi_link = f"upi://pay?pa={upi_id}&pn={merchant_name}&am={amount}&cu=INR&tn={reference_code}"
    
    try:
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
        
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        response_data = {
            'session_id': session.id,
            'amount': amount,
            'plan_name': plan.name,
            'expires_at': session.expires_at.isoformat(),
            'upi_link': upi_link,
            'qr_code_data': f"data:image/png;base64,{qr_code_base64}"
        }
        return Response(response_data)
    except Exception as e:
        logger.error(f"Error generating QR code: {str(e)}")
        return Response(
            {"error": "Failed to generate payment QR code"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def redirect_to_upi(request, session_id):
    try:
        if request.user.is_authenticated:
            session = get_object_or_404(PaymentSession, id=session_id, user=request.user)
        else:
            session = get_object_or_404(PaymentSession, id=session_id)
        
        if timezone.now() > session.expires_at:
            return Response({"error": "Payment session expired"}, status=400)
        
        upi_id = "pran.eth@axl"
        merchant_name = "Ghiblit"
        amount = session.amount
        
        upi_url = f"upi://pay?pa={upi_id}&pn={merchant_name}&am={amount}&cu=INR&tn={session.reference_code}"
        
        return redirect(upi_url)
    except Exception as e:
        logger.error(f"UPI redirect error for session {session_id}: {str(e)}")
        return Response({"error": "Failed to process payment link"}, status=500)


@api_view(['GET'])
def get_payment_qr(request, session_id):
    try:
        if request.user.is_authenticated:
            session = get_object_or_404(PaymentSession, id=session_id, user=request.user)
        else:
            session = get_object_or_404(PaymentSession, id=session_id)
        
        if timezone.now() > session.expires_at:
            return Response({"error": "Payment session expired"}, status=400)
        
        upi_id = "pran.eth@axl"
        merchant_name = "Ghiblit"
        amount = session.amount
        
        upi_url = f"upi://pay?pa={upi_id}&pn={merchant_name}&am={amount}&cu=INR&tr={session.reference_code}"
        
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
        
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        
        return HttpResponse(buffer, content_type="image/png")
    except Exception as e:
        return Response({"error": str(e)}, status=500)