from rest_framework import serializers
from .models import Payment, PricingPlan

class PricingPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingPlan
        fields = ['id', 'name', 'credits', 'price_inr', 'is_active']
        
class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'currency', 'credits_purchased', 
            'payment_method', 'transaction_id', 'status',
            'created_at', 'updated_at', 'is_blocked'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'is_blocked'
        ]
        
class PaymentVerificationSerializer(serializers.Serializer):
    transaction_id = serializers.CharField(required=False)
    screenshot = serializers.ImageField(required=False)
    
    def validate(self, data):
        if not data.get('transaction_id') and not data.get('screenshot'):
            raise serializers.ValidationError(
                "Either transaction_id or screenshot must be provided."
            )
        return data