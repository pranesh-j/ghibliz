from django.contrib import admin
from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'free_transform_used', 'credit_balance', 'created_at')
    search_fields = ('user__username', 'user__email')
    list_filter = ('free_transform_used',)