# test_api.py
import requests
import os

# Configuration
API_URL = "http://127.0.0.1:8000/api/transform/"

def test_image_upload():
    # Replace with the path to a test image
    image_path = "test_image.jpg"
    
    if not os.path.exists(image_path):
        print(f"Error: Test image not found at {image_path}")
        return
    
    # Open the file
    with open(image_path, 'rb') as img:
        # Create the files dictionary
        files = {'image': (os.path.basename(image_path), img, 'image/jpeg')}
        
        # Send the POST request
        print("Uploading image for transformation...")
        response = requests.post(API_URL, files=files)
        
        if response.status_code == 201:
            print("Success! Image transformed.")
            print("Response:", response.json())
        else:
            print(f"Error: Status code {response.status_code}")
            print("Response:", response.text)

if __name__ == "__main__":
    test_image_upload()