import requests
import logging
import hmac
import hashlib
import json
import uuid
from django.conf import settings
from standardwebhooks import Webhook
from .utils import get_user_country

logger = logging.getLogger(__name__)

class DodoPaymentsClient:
    """Client for Dodo Payments API integration"""

    def __init__(self):
        """Initialize Dodo Payments client with appropriate base URL and credentials"""
        self.base_url = "https://test.dodopayments.com" if settings.DODO_TEST_MODE else "https://live.dodopayments.com"
        self.api_key = settings.DODO_API_KEY
        self.webhook_secret = settings.DODO_WEBHOOK_SECRET

    def create_payment(self, request, pricing_plan, user):
        """
        Create a payment link for a user and pricing plan.
        
        Args:
            request: The HTTP request object (used for country detection)
            pricing_plan: The PricingPlan instance
            user: The User instance making the payment
            
        Returns:
            dict: Payment data including payment_id and payment_link
            
        Raises:
            ValueError: If Dodo product ID is missing
            requests.exceptions.RequestException: If API call fails
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        customer_name = f"{user.first_name} {user.last_name}".strip() or user.username

        if pricing_plan.region == 'GLOBAL':
            payload_amount = int(pricing_plan.price_usd * 100)
            currency = 'USD'
        else: # India
            payload_amount = max(50, int(pricing_plan.price_inr))
            currency = 'INR'

        payload_amount = max(1, payload_amount)

        user_country_code = get_user_country(request)
        default_country = 'IN' if pricing_plan.region == 'IN' else 'US'
        billing_country = user_country_code if user_country_code else default_country
        logger.info(f"Determined billing country for payment creation: {billing_country} "
                    f"(Detected: {user_country_code}, Fallback used: {not user_country_code})")

        dodo_product_identifier = pricing_plan.dodo_product_id
        if not dodo_product_identifier:
            logger.error(f"PricingPlan ID {pricing_plan.id} ({pricing_plan.name}) is missing the required dodo_product_id.")
            raise ValueError(f"Configuration error: Dodo Product ID not set for plan '{pricing_plan.name}' (ID: {pricing_plan.id})")

        payload = {
            "payment_link": True,
            "customer": {
                "email": user.email,
                "name": customer_name,
                "create_new_customer": True
            },
            "billing": {
                "country": billing_country,
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
            logger.info(f"Dodo create_payment response status: {response.status_code}")
            if response.status_code != 200:
                logger.warning(f"Dodo create_payment response text: {response.text}")
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"Dodo payment creation failed: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response status: {e.response.status_code}, Response text: {e.response.text}")
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
            logger.info(f"Dodo get_payment_status raw response for {payment_id} - Status: {response.status_code}, Body: {response.text}")

            response.raise_for_status()
            return response.json()
        except requests.exceptions.JSONDecodeError as json_err:
            logger.error(f"Failed to decode JSON from Dodo status response for {payment_id}: {str(json_err)}. Body was: {response.text}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to check Dodo payment status for {payment_id}: {str(e)}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response: {e.response.text}")
            return None
        except Exception as ex:
            logger.exception(f"Unexpected error checking Dodo payment status for {payment_id}: {str(ex)}")
            return None

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
            logger.warning("Webhook verification failed: Missing required headers.")
            return False

        try:
            webhook = Webhook(self.webhook_secret)

            headers = {
                "webhook-id": webhook_id,
                "webhook-signature": signature,
                "webhook-timestamp": timestamp
            }

            webhook.verify(payload, headers)
            logger.info(f"Webhook signature verified successfully for ID: {webhook_id}")
            return True
        except Exception as e:
            logger.error(f"Webhook signature verification failed for ID {webhook_id}: {str(e)}")
            return False

def generate_order_id():
    """Generate a unique order ID for reference"""
    return f"GHB-{uuid.uuid4().hex[:8].upper()}"
