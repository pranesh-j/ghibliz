# backend/ghiblit/payments/utils.py

from django.contrib.gis.geoip2 import GeoIP2
from django.conf import settings
import os

def get_user_country(request):
    """
    Get user's country from IP address using GeoIP2.
    Returns country code (e.g. 'IN' for India, 'US' for United States).
    """
    try:
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        
        # Use Django's GeoIP2 for lookup
        g = GeoIP2()
        country = g.country(ip)
        
        return country['country_code']
    except Exception as e:
        # Log the error
        print(f"GeoIP lookup error: {e}")
        # Default to global if detection fails
        return None

def get_user_region(request):
    """
    Determine if user is from India or global region.
    Returns 'IN' for India, 'GLOBAL' for others.
    """
    country_code = get_user_country(request)
    
    if country_code == 'IN':
        return 'IN'
    else:
        return 'GLOBAL'