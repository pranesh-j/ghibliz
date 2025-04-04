from django.urls import path
from . import views

urlpatterns = [
    path('plans/', views.get_pricing_plans, name='pricing-plans'),
    path('create/', views.CreatePaymentView.as_view(), name='create-payment'),
    path('<int:payment_id>/verify/', views.VerifyPaymentView.as_view(), name='verify-payment'),
    path('<int:payment_id>/status/', views.get_payment_status, name='payment-status'),
    path('history/', views.get_user_payments, name='user-payments'),
    path('sessions/create/', views.create_payment_session, name='create-payment-session'),
    path('sessions/<int:session_id>/verify/', views.verify_payment, name='verify-payment'),
    path('redirect-to-upi/<int:session_id>/', views.redirect_to_upi, name='redirect-to-upi'),
]