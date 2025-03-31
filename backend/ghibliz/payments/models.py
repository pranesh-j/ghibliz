# payments/models.py
from django.db import models
from django.contrib.auth.models import User


class Payment(models.Model):
    PAYMENT_METHODS = (
        ('stripe', 'Stripe'),
        ('upi', 'UPI'),
    )
    
    PAYMENT_STATUS = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    credits_purchased = models.IntegerField(default=5)  # Number of image transforms
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reference_code = models.CharField(max_length=12, blank=True, null=True)

    # Add these fields to the Payment model
    screenshot = models.ImageField(upload_to='payment_screenshots/', null=True, blank=True)
    upi_id = models.CharField(max_length=255, null=True, blank=True)
    upi_reference = models.CharField(max_length=255, null=True, blank=True)
    is_blocked = models.BooleanField(default=False)  # To allow admin to block users
    verification_method = models.CharField(
        max_length=20, 
        choices=[('transaction_id', 'Transaction ID'), ('screenshot', 'Screenshot')],
        null=True, blank=True
    )

    def __str__(self):
        return f"Payment {self.id} by {self.user.username} ({self.status})"

    class Meta:
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-created_at']


class PricingPlan(models.Model):
    name = models.CharField(max_length=100)
    credits = models.IntegerField()
    price_usd = models.DecimalField(max_digits=10, decimal_places=2)
    price_inr = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.credits} credits for ${self.price_usd}"

    class Meta:
        verbose_name = 'Pricing Plan'
        verbose_name_plural = 'Pricing Plans'

# Add to payments/models.py
class PaymentSession(models.Model):
    SESSION_STATUS = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    plan = models.ForeignKey(PricingPlan, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference_code = models.CharField(max_length=12, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=SESSION_STATUS, default='pending')
    
    def __str__(self):
        return f"Payment Session {self.id} - {self.reference_code} - {self.status}"
    
    class Meta:
        verbose_name = 'Payment Session'
        verbose_name_plural = 'Payment Sessions'
        ordering = ['-created_at']
    
    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


class PaymentVerificationAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    session_id = models.IntegerField()
    reference_code = models.CharField(max_length=12)
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[
        ('success', 'Success'),
        ('failed', 'Failed')
    ])
    reason = models.CharField(max_length=50, null=True, blank=True)
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True)
    error_details = models.TextField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Payment Verification Attempt'
        verbose_name_plural = 'Payment Verification Attempts'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"Verification {self.id} for {self.user.username} ({self.status})"