# backend/ghiblit/payments/dodo.py

import requests
import logging
import hmac
import hashlib
import json
import uuid
from django.conf import settings
from standardwebhooks import Webhook
logger = logging.getLogger(__name__)

class DodoPaymentsClient:
    """Client for Dodo Payments API integration"""

    def __init__(self):
        # The base URL without version path (as per documentation) [cite: 131]
        self.base_url = "https://test.dodopayments.com" if settings.DODO_TEST_MODE else "https://live.dodopayments.com" # [cite: 131]
        self.api_key = settings.DODO_API_KEY # [cite: 131]
        self.webhook_secret = settings.DODO_WEBHOOK_SECRET # [cite: 131]

    def create_payment(self, pricing_plan, user):
        # Prepare the API request payload
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Create customer data
        customer_name = f"{user.first_name} {user.last_name}".strip() or user.username
        
        # Determine amount and currency based on plan's region
        if pricing_plan.region == 'GLOBAL':
            payload_amount = max(1, int(pricing_plan.price_usd))
            currency = 'USD'
        else:
            payload_amount = max(50, int(pricing_plan.price_inr))
            currency = 'INR'

        # --- Get the actual product ID from Dodo (stored in your model) ---
        dodo_product_identifier = pricing_plan.dodo_product_id
        if not dodo_product_identifier:
            logger.error(f"PricingPlan ID {pricing_plan.id} ({pricing_plan.name}) is missing the required dodo_product_id.")
            raise ValueError(f"Configuration error: Dodo Product ID not set for plan '{pricing_plan.name}' (ID: {pricing_plan.id})")

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
                    "amount": payload_amount,
                    "currency": currency,
                    "product_id": dodo_product_identifier,
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
            dict: Payment details including status if successful
            None: If there was an error and we're not raising exceptions

        Raises:
            requests.exceptions.RequestException: If configured to raise on errors
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

        try:
            response = requests.get(
                f"{self.base_url}/payments/{payment_id}",
                headers=headers
            )
            # Log raw response before raising status or parsing JSON
            logger.info(f"Dodo get_payment_status raw response for {payment_id} - Status: {response.status_code}, Body: {response.text}")

            response.raise_for_status()  # Check for HTTP errors first
            return response.json()
        except requests.exceptions.JSONDecodeError as json_err:
            logger.error(f"Failed to decode JSON from Dodo status response for {payment_id}: {str(json_err)}. Body was: {response.text}")
            # Decide how to handle - maybe return None or raise a specific error
            return None  # Or raise custom error
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to check Dodo payment status for {payment_id}: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response: {e.response.text}")
            # Decide how to handle - return None or raise
            return None  # Or raise e
        except Exception as ex:  # Catch any other unexpected errors
            logger.exception(f"Unexpected error checking Dodo payment status for {payment_id}: {str(ex)}")
            # Decide how to handle - return None or raise
            return None  # Or raise ex

    def verify_webhook_signature(self, payload, signature, webhook_id, timestamp):
        """
        Verify webhook signature from Dodo Payments [cite: 143]

        Args:
            payload: The raw request body [cite: 143]
            signature: The webhook-signature header value [cite: 143]
            webhook_id: The webhook-id header value [cite: 143]
            timestamp: The webhook-timestamp header value [cite: 143]

        Returns:
            bool: True if signature is valid [cite: 144]
        """
        if not signature or not webhook_id or not timestamp: # [cite: 144]
            logger.warning("Webhook verification failed: Missing required headers.")
            return False

        # Signature verification using Standard Webhooks approach [cite: 145]
        try:
            # Ensure standardwebhooks library is installed and imported
            webhook = Webhook(self.webhook_secret) # [cite: 145]

            headers = {
                "webhook-id": webhook_id, # [cite: 145]
                "webhook-signature": signature, # [cite: 145]
                "webhook-timestamp": timestamp # [cite: 146]
            }

            # Verify will raise an exception if invalid [cite: 146]
            webhook.verify(payload, headers)
            logger.info(f"Webhook signature verified successfully for ID: {webhook_id}")
            return True
        except Exception as e: # Catches verification errors from standardwebhooks
            logger.error(f"Webhook signature verification failed for ID {webhook_id}: {str(e)}") # [cite: 147]
            return False


def generate_order_id():
    """Generate a unique order ID for reference"""
    return f"GHB-{uuid.uuid4().hex[:8].upper()}" # [cite: 147]
