# backend/ghiblit/payments/dodo.py

import requests
import logging
import hmac
import hashlib
import json
import uuid
from django.conf import settings

logger = logging.getLogger(__name__)

class DodoPaymentsClient:
    """Client for Dodo Payments API integration"""
    
    def __init__(self):
        # The base URL without version path (as per documentation)
        self.base_url = "https://test.dodopayments.com" if settings.DODO_TEST_MODE else "https://live.dodopayments.com"
        self.api_key = settings.DODO_API_KEY
        self.webhook_secret = settings.DODO_WEBHOOK_SECRET
        
    def create_payment(self, pricing_plan, user):
        # Prepare the API request payload
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Create customer data
        customer_name = f"{user.first_name} {user.last_name}".strip() or user.username
        amount = max(50, int(pricing_plan.price_inr))
        # Create the payload according to Dodo API requirements
        payload = {
            "payment_link": True,
            "customer": {
                "email": user.email,
                "name": customer_name,
                "create_new_customer": True
            },
            "billing": {
                "country": "US",
                "city": "City",
                "state": "State",
                "street": "Street",
                "zipcode": "00000"
            },
            "product_cart": [
                {
                    "amount": int(pricing_plan.price_inr),
                    "product_id": f"credits_{pricing_plan.id}",
                    "quantity": 1
                }
            ],
            "metadata": {
                "credits": str(pricing_plan.credits),
                "plan_name": pricing_plan.name,
                "user_id": str(user.id)
            },
            "return_url": settings.DODO_SUCCESS_URL
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/payments",
                headers=headers,
                json=payload
            )
            # For debugging
            print(f"Dodo API request: {self.base_url}/payments")
            print(f"Payload: {json.dumps(payload)}")
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Dodo payment creation failed: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response: {e.response.text}")
            raise

    def get_payment_status(self, payment_id):
        """
        Check the status of a payment
        
        Args:
            payment_id: The Dodo payment ID
            
        Returns:
            dict: Payment details including status
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        
        try:
            response = requests.get(
                f"{self.base_url}/payments/{payment_id}",
                headers=headers
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to check payment status: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response: {e.response.text}")
            raise
    
    def verify_webhook_signature(self, payload, signature, webhook_id, timestamp):
        """
        Verify webhook signature from Dodo Payments
        
        Args:
            payload: The raw request body
            signature: The webhook-signature header value
            webhook_id: The webhook-id header value
            timestamp: The webhook-timestamp header value
            
        Returns:
            bool: True if signature is valid
        """
        if not signature or not webhook_id or not timestamp:
            return False
        
        # Signature verification using Standard Webhooks approach
        # This follows the documentation for verifying Dodo webhook signatures
        try:
            from standardwebhooks import Webhook
            webhook = Webhook(self.webhook_secret)
            
            headers = {
                "webhook-id": webhook_id,
                "webhook-signature": signature,
                "webhook-timestamp": timestamp
            }
            
            # Verify will raise an exception if invalid
            webhook.verify(payload, headers)
            return True
        except Exception as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            return False


def generate_order_id():
    """Generate a unique order ID for reference"""
    return f"GHB-{uuid.uuid4().hex[:8].upper()}"