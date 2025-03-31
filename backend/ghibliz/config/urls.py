from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from django.views.static import serve

# Add a simple root view for testing
def home(request):
    return HttpResponse("Welcome to Ghiblify Home")

urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/payments/', include('payments.urls')),
    
    # Explicit media serving pattern for development
    # This ensures media files are served even if the automatic approach fails
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

# Standard approach for serving static and media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Also add static files serving in development if needed
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)