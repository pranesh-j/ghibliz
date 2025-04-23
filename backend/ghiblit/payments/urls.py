from django.urls import path
from . import views

urlpatterns = [
    path('plans/', views.get_pricing_plans, name='pricing-plans'),
    path('create/', views.CreatePaymentView.as_view(), name='create-payment'),
    path('<int:payment_id>/status/', views.check_payment_status, name='payment-status'),
    path('history/', views.get_user_payments, name='user-payments'),
    path('webhook/', views.webhook_handler, name='webhook'),
]