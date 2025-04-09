from django.contrib import admin
from django.utils.html import format_html
from .models import Payment, PricingPlan

@admin.register(PricingPlan)
class PricingPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'credits', 'price_inr', 'is_active')
    list_filter = ('is_active',)

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'amount', 'currency', 'credits_purchased', 
                  'payment_method', 'status', 'is_blocked', 'created_at', 'verification_method')
    list_filter = ('status', 'payment_method', 'is_blocked', 'created_at')
    search_fields = ('user__username', 'user__email', 'transaction_id')
    
    # Actions to approve or reject payments
    actions = ['approve_payments', 'reject_payments', 'block_user']
    
    def screenshot_preview(self, obj):
        if obj.screenshot:
            return format_html('<img src="{}" width="150" height="auto" />', obj.screenshot.url)
        return "No Screenshot"
    
    screenshot_preview.short_description = 'Payment Screenshot'
    
    def approve_payments(self, request, queryset):
        for payment in queryset:
            if payment.status == 'pending':
                # Add credits to user's account
                profile = payment.user.profile
                profile.credit_balance += payment.credits_purchased
                profile.save()
                
                # Mark payment as completed
                payment.status = 'completed'
                payment.save()
                
        self.message_user(request, f"{queryset.count()} payments approved and credits added.")
    approve_payments.short_description = "Approve selected payments and add credits"
    
    def reject_payments(self, request, queryset):
        queryset.update(status='failed')
        self.message_user(request, f"{queryset.count()} payments marked as failed.")
    reject_payments.short_description = "Reject selected payments"
    
    def block_user(self, request, queryset):
        for payment in queryset:
            # Block this payment
            payment.is_blocked = True
            payment.save()
            
            # Also block all other payments from this user
            user_payments = Payment.objects.filter(user=payment.user)
            user_payments.update(is_blocked=True)
            
        self.message_user(request, f"Users blocked for {queryset.count()} payments.")
    block_user.short_description = "Block users for selected payments"
    
    # Customize form to show screenshot preview
    readonly_fields = ('screenshot_preview',)
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('user', 'amount', 'currency', 'credits_purchased', 'payment_method', 'status')
        }),
        ('Verification', {
            'fields': ('transaction_id', 'verification_method', 'screenshot', 'screenshot_preview')
        }),
        ('Administration', {
            'fields': ('is_blocked',)
        }),
    )