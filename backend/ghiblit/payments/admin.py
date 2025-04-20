# payments/admin.py
from django.contrib import admin
from .models import Payment, PricingPlan, WebhookEvent

@admin.register(PricingPlan)
class PricingPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'credits', 'price_inr', 'is_active')
    list_filter = ('is_active',)

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'amount', 'credits_purchased', 
                   'status', 'dodo_payment_id', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'user__email', 'dodo_payment_id')

@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'payment', 'processed', 'created_at')
    list_filter = ('event_type', 'processed', 'created_at')
    search_fields = ('event_id', 'payment__dodo_payment_id')