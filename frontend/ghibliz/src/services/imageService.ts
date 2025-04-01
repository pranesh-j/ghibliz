// frontend/ghibliz/src/services/imageService.ts

import { api } from './api';

// Define the RecentImage interface
export interface RecentImage {
  id: number;
  original: string;
  processed: string;
}

// Create the service object
const ImageService = {
  /**
   * Transforms an image using the backend API
   * @param imageFile - The image file to transform
   * @returns The transformed image data
   */
  async transformImage(imageFile: File) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await api.post('/transform/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
  
  /**
   * Fetches recent transformed images from the backend
   * @param limit - The number of images to fetch (default: 6)
   * @returns Array of image data objects
   */
  async getRecentImages(limit: number = 6) {
    try {
      const response = await api.get(`/images/recent/?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent images:', error);
      return [];
    }
  },
  
  /**
   * Fetches images transformed by the current user (requires authentication)
   * @returns Array of user's transformed images
   */
  async getUserImages() {
    try {
      const response = await api.get('/user/images/');
      return response.data;
    } catch (error) {
      console.error('Error fetching user images:', error);
      return [];
    }
  },
  
  /**
   * Downloads a transformed image using the provided token
   * @param imageId - The ID of the image to download
   * @param token - The download token
   * @returns URL to download the image
   */
  getDownloadUrl(imageId: number, token: string) {
    return `${api.defaults.baseURL}/download/${imageId}/?token=${token}`;
  }
};

// Export both as named export for new code
export const imageService = ImageService;

// Export as default for backward compatibility
export default ImageService;