// src/services/imageService.ts
import api from './api';

export interface GeneratedImage {
  id: number;
  image_url: string | null;
  preview_url: string | null;
  is_paid: boolean;
  created_at: string;
  download_token?: string;
  token_expires_at?: string;
}

export interface ShareResponse {
  share_url: string;
  expires_at: string;
}

export interface RecentImage {
  id: number;
  original: string;
  processed: string;
}

const ImageService = {
  // Transform an image to Ghibli style
  transformImage: async (imageFile: File): Promise<GeneratedImage> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await api.post<GeneratedImage>('/transform/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
  
  // Get user's transformed images
  getUserImages: async (): Promise<GeneratedImage[]> => {
    const response = await api.get<GeneratedImage[]>('/images/user/');
    return response.data;
  },
  
  // Get recent public images
  getRecentImages: async (limit: number = 6): Promise<RecentImage[]> => {
    const response = await api.get<RecentImage[]>(`/images/recent/?limit=${limit}`);
    return response.data;
  },
  
  // Download a transformed image
  downloadImage: async (imageId: number, token: string): Promise<Blob> => {
    const response = await api.get(`/images/${imageId}/download/?token=${token}`, {
      responseType: 'blob',
    });
    
    return response.data;
  },
  
  // Download an image with auto download
  downloadAndSaveImage: async (imageId: number, token: string): Promise<boolean> => {
    try {
      const blob = await ImageService.downloadImage(imageId, token);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ghiblified-image-${imageId}.jpg`;
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  },
  
  // Generate shareable link
  shareImage: async (imageId: number): Promise<ShareResponse> => {
    const response = await api.post<ShareResponse>(`/images/${imageId}/share/`);
    return response.data;
  }
};

export default ImageService;