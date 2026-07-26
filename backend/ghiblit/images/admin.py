# images/admin.py
from django.contrib import admin
from .models import GeneratedImage, UserCustomStyle


@admin.register(GeneratedImage)
class GeneratedImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'is_paid', 'created_at')
    list_filter = ('is_paid', 'created_at')
    search_fields = ('user__username',)
    readonly_fields = ('download_token',)


@admin.register(UserCustomStyle)
class UserCustomStyleAdmin(admin.ModelAdmin):
    list_display = ('id', 'display_name', 'style_key', 'user', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('user__username', 'display_name', 'style_key')
    readonly_fields = ('style_key', 'created_at')
    # prompt is intentionally not in list_display — visible only in detail view for admins