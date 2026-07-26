from django.core.management.base import BaseCommand
from payments.models import PricingPlan

class Command(BaseCommand):
    help = 'Creates default pricing plan for the application'

    def handle(self, *args, **options):
        if PricingPlan.objects.exists():
            self.stdout.write(self.style.WARNING('Pricing plans already exist. Command skipped.'))
            return

        PricingPlan.objects.create(
            name="Standard Pack",
            credits=5,
            price_usd=1.00,
            price_inr=50.00,
            is_active=True
        )

        self.stdout.write(self.style.SUCCESS('Successfully created default pricing plan'))