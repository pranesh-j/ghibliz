from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def api_root(request):
    return HttpResponse("Welcome to Ghiblify API")