from django.db import models
from django.contrib.auth.models import User

class PricingPlan(models.Model):
    name = models.CharField(max_length=100)
    credits = models.IntegerField()
    price_usd = models.DecimalField(max_digits=10, decimal_places=2)
    price_inr = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    dodo_product_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    region = models.CharField(max_length=10, choices=[('IN', 'India'), ('GLOBAL', 'Global')], default='IN')

    def __str__(self):
        return f"{self.name} - {self.credits} credits for ₹{self.price_inr}"

    class Meta:
        verbose_name = 'Pricing Plan'
        verbose_name_plural = 'Pricing Plans'

class Payment(models.Model):
    PAYMENT_STATUS = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    credits_purchased = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    dodo_payment_id = models.CharField(max_length=255, blank=True, null=True)
    dodo_payment_link = models.URLField(max_length=1000, blank=True, null=True)
    order_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Payment {self.id} by {self.user.username} ({self.status})"

    class Meta:
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']

class WebhookEvent(models.Model):
    event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=100)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='webhook_events', null=True, blank=True)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} - {self.event_id}"

    class Meta:
        verbose_name = 'Webhook Event'
        verbose_name_plural = 'Webhook Events'
        ordering = ['-created_at']