import api from './api';

export interface RecentImage {
    id: number;
    original: string | null;
    processed: string | null;
}

interface ImageTransformResponse {
    id?: number; // May not exist for anonymous
    image_url: string | null;
    preview_url: string | null;
    is_paid: boolean;
    created_at: string;
    download_token?: string; // Only for authenticated/paid
    updated_credit_balance?: number; // Added based on backend changes
    // Add other fields if your backend returns more
}

interface ShareResponse {
    share_url: string;
}

// Add in-memory cache for recent images
const imageCache = new Map<string, string>();

const cachedFetch = async (url: string): Promise<string> => {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }
  
  try {
    // Check if the browser cache API is available
    if ('caches' in window) {
      const cache = await caches.open('ghiblit-image-cache');
      const cachedResponse = await cache.match(url);
      
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        const objectUrl = URL.createObjectURL(blob);
        imageCache.set(url, objectUrl);
        return objectUrl;
      }
    }
    
    // Fallback to network request if not in cache
    const response = await fetch(url, { cache: 'force-cache' });
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    // Store in memory cache
    imageCache.set(url, objectUrl);
    
    // Also store in browser cache if available
    if ('caches' in window) {
      const cache = await caches.open('ghiblit-image-cache');
      cache.put(url, new Response(blob));
    }
    
    return objectUrl;
  } catch (error) {
    console.error('Error fetching and caching image:', error);
    return url; // Fallback to original URL
  }
};

const ImageService = {
    // Transform image
// Update this function in src/services/imageService.ts
    transformImage: async (imageFile: File, stylePreset: string = 'ghibli'): Promise<ImageTransformResponse> => {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('style', stylePreset); // Add the style parameter

        try {
            const response = await api.post<ImageTransformResponse>('api/transform/', formData);
            return response.data;
        } catch (error: any) {
            console.error("Image transform API error:", error.response?.data || error.message);
            throw error;
        }
    },
    // Get recent images
    getRecentImages: async (limit: number = 6): Promise<RecentImage[]> => {
        try {
            const response = await api.get<RecentImage[]>(`api/images/recent/?limit=${limit}`);
            const images = response.data;
            
            // Pre-cache all images
            for (const image of images) {
                if (image.processed) {
                    cachedFetch(image.processed).catch(console.error);
                }
                if (image.original) {
                    cachedFetch(image.original).catch(console.error);
                }
            }
            
            return images;
        } catch (error) {
            console.error("Get recent images API error:", error);
            return [];
        }
    },

    // Download image (if using backend endpoint)
    downloadImage: async (imageId: number, token: string): Promise<Blob> => {
        try {
            // --- FIX: Removed leading /api/ ---
            // Adjust the endpoint if needed, e.g., 'images/download/{imageId}/?token={token}'
            const response = await api.get<Blob>(`api/images/download/${imageId}/?token=${token}`, {
                responseType: 'blob',
            });
            return response.data;
        } catch (error) {
            console.error("Download image API error:", error);
            throw error;
        }
    },

    // Helper to trigger download in browser
    downloadAndSaveImage: async (imageId: number, token: string, filename?: string) => {
        try {
            const blob = await ImageService.downloadImage(imageId, token);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || `ghiblified-image-${imageId}.jpg`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url); // Clean up memory
        } catch (error) {
            console.error("Failed to download and save image:", error);
            throw error; // Re-throw to be caught by UI
        }
    },



    shareImage: async (imageId: number): Promise<ShareResponse> => {
        try {

            const response = await api.post<ShareResponse>(`api/images/${imageId}/share/`, {});

            return response.data;
        } catch (error) {
            console.error("Share image API error:", error);
            throw error;
        }
    },
};

export default ImageService;