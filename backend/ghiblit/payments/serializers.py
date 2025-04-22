# backend/ghiblit/payments/serializers.py

from rest_framework import serializers
from .models import Payment, PricingPlan

class PricingPlanSerializer(serializers.ModelSerializer):
    display_price = serializers.SerializerMethodField()
    
    class Meta:
        model = PricingPlan
        fields = ['id', 'name', 'credits', 'price_inr', 'price_usd', 'region', 'is_active', 'display_price']
        
    def get_display_price(self, obj):
        """Return formatted price with currency symbol"""
        if obj.region == 'GLOBAL':
            return f"${obj.price_usd}"
        else:
            return f"₹{obj.price_inr}"

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'currency', 'credits_purchased', 
            'status', 'dodo_payment_id', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']