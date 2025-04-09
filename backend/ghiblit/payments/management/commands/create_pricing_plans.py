from django.core.management.base import BaseCommand
from payments.models import PricingPlan

class Command(BaseCommand):
    help = 'Creates default pricing plans for the application'

    def handle(self, *args, **options):
        # Delete existing plans if requested
        if options.get('delete_existing'):
            PricingPlan.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Deleted existing pricing plans'))
        
        # Check if plans already exist
        if PricingPlan.objects.exists() and not options.get('delete_existing'):
            self.stdout.write(self.style.WARNING('Pricing plans already exist. Use --delete-existing to replace them.'))
            return

        # Create the required plans
        PricingPlan.objects.create(
            name="Basic",
            credits=3,
            price_usd=0.60,
            price_inr=49.00,
            is_active=True
        )

        PricingPlan.objects.create(
            name="Standard",
            credits=10,
            price_usd=1.20,
            price_inr=99.00,
            is_active=True
        )

        self.stdout.write(self.style.SUCCESS('Successfully created pricing plans'))
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--delete-existing',
            action='store_true',
            help='Delete existing pricing plans before creating new ones',
        )