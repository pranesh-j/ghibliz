import os
import django
from django.core.files.base import ContentFile
from pathlib import Path
from PIL import Image
import io

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Import Django models after setup
from images.models import GeneratedImage
from django.contrib.auth.models import User
from config.storage import GeneratedImagesStorage, PaymentScreenshotsStorage

def test_storage_classes():
    """Test both storage classes"""
    print("\n=== Testing Django Storage Classes ===")
    
    # Test GeneratedImagesStorage
    images_storage = GeneratedImagesStorage()
    print(f"Testing GeneratedImagesStorage (bucket: {images_storage.bucket_name})")
    try:
        # Create a test file
        images_storage.save("django_test.txt", ContentFile(b"Testing GeneratedImagesStorage"))
        
        # Verify it exists
        if images_storage.exists("django_test.txt"):
            print("✅ Successfully saved and verified file in ghiblits bucket")
            print(f"URL: {images_storage.url('django_test.txt')}")
            
            # Clean up
            images_storage.delete("django_test.txt")
            print("✅ Successfully deleted test file")
        else:
            print("❌ File save operation failed")
    except Exception as e:
        print(f"❌ Error with GeneratedImagesStorage: {str(e)}")
    
    # Test PaymentScreenshotsStorage
    payments_storage = PaymentScreenshotsStorage()
    print(f"\nTesting PaymentScreenshotsStorage (bucket: {payments_storage.bucket_name})")
    try:
        # Create a test file
        payments_storage.save("django_test.txt", ContentFile(b"Testing PaymentScreenshotsStorage"))
        
        # Verify it exists
        if payments_storage.exists("django_test.txt"):
            print("✅ Successfully saved and verified file in payments bucket")
            print(f"URL: {payments_storage.url('django_test.txt')}")
            
            # Clean up
            payments_storage.delete("django_test.txt")
            print("✅ Successfully deleted test file")
        else:
            print("❌ File save operation failed")
    except Exception as e:
        print(f"❌ Error with PaymentScreenshotsStorage: {str(e)}")

def test_model_file_upload():
    """Test file upload through the Django model"""
    print("\n=== Testing Model File Upload ===")
    
    # Create a test image
    img = Image.new('RGB', (100, 100), color='red')
    img_io = io.BytesIO()
    img.save(img_io, format='JPEG')
    img_io.seek(0)
    
    try:
        # Get or create a test user
        user, created = User.objects.get_or_create(
            username='teststorage',
            defaults={'email': 'test@example.com'}
        )
        print(f"Using test user: {user.username}")
        
        # Create a test GeneratedImage instance
        image = GeneratedImage()
        image.user = user
        image.is_paid = True
        
        # Save the image
        image.image.save('test_model_image.jpg', ContentFile(img_io.getvalue()))
        
        # Print details
        print("✅ Successfully created GeneratedImage")
        print(f"Image ID: {image.id}")
        print(f"Image URL: {image.image.url}")
        
        # Verify we can access the image
        print("\nAttempting to read back the image...")
        try:
            with image.image.open('rb') as f:
                print(f"✅ Successfully read back {len(f.read())} bytes from {image.image.name}")
        except Exception as e:
            print(f"❌ Error reading back image: {str(e)}")
        
        # Clean up (optional - comment out to keep the test image)
        image.delete()
        print("✅ Test image deleted from database and storage")
        
    except Exception as e:
        print(f"❌ Error in model file upload test: {str(e)}")

if __name__ == "__main__":
    test_storage_classes()
    test_model_file_upload()