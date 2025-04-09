import os
from django.core.wsgi import get_wsgi_application

if os.environ.get('RENDER', 'False') == 'True':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.production')
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()