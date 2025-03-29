# test_models.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from users.models import UserProfile
from images.models import GeneratedImage
from payments.models import Payment, PricingPlan

# Create a test user
user, created = User.objects.get_or_create(
    username='testuser',
    email='test@example.com'
)
if created:
    user.set_password('password123')
    user.save()
    print(f"Created test user: {user.username}")
else:
    print(f"Test user already exists: {user.username}")

# Profile should be automatically created via signals
profile = UserProfile.objects.get(user=user)
print(f"User profile: {profile}, Free transform used: {profile.free_transform_used}")

# Create a pricing plan if it doesn't exist
pricing_plan, created = PricingPlan.objects.get_or_create(
    name="Standard Pack",
    defaults={
        'credits': 5,
        'price_usd': 1.00,
        'price_inr': 50.00,
        'is_active': True
    }
)
print(f"Pricing plan: {pricing_plan}")

# Print success message
print("Models test completed successfully!")