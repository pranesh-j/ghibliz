# test_openai_image.py - create this file in your backend directory
import os
from openai import OpenAI
from dotenv import load_dotenv
from PIL import Image
import tempfile

# Load .env
load_dotenv()

# Initialize client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Path to a test image
test_image_path = "path/to/test/image.jpg"  # Replace with an actual image path

# Load and prepare image
img = Image.open(test_image_path)
img = img.convert('RGBA')  # Try with transparency

# Save to temporary file
temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
img.save(temp_file.name)
temp_file.close()

# Try the API call
try:
    with open(temp_file.name, "rb") as file:
        # Method 1: Try create_variation (better for style transfer)
        print("Trying create_variation...")
        response = client.images.create_variation(
            image=file,
            n=1,
            size="1024x1024"
        )
        print("Success with create_variation!")
except Exception as e:
    print(f"Method 1 failed: {str(e)}")

# Clean up
if os.path.exists(temp_file.name):
    os.unlink(temp_file.name)