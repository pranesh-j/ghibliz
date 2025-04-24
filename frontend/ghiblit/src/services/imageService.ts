import api from './api';

export interface RecentImage {
    id: number;
    original: string | null;
    processed: string | null;
    created_at?: string;  // Add created_at for sorting
}

interface ImageTransformResponse {
    id?: number;
    image_url: string | null;
    preview_url: string | null;
    is_paid: boolean;
    created_at: string;
    download_token?: string;
    updated_credit_balance?: number;
}

// Store the last fetch time for gallery images
let lastGalleryFetchTime = 0;
// Store the cached images
let cachedGalleryImages: RecentImage[] = [];

const ImageService = {
    // Transform image
    transformImage: async (imageFile: File, stylePreset: string = 'ghibli'): Promise<ImageTransformResponse> => {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('style', stylePreset);

        try {
            const response = await api.post<ImageTransformResponse>('api/transform/', formData);
            return response.data;
        } catch (error: any) {
            console.error("Image transform API error:", error.response?.data || error.message);
            throw error;
        }
    },
    
    // Get recent images
    getRecentImages: async (limit: number = 12): Promise<RecentImage[]> => {
        const now = Date.now();
        const sixHoursMs = 6 * 60 * 60 * 1000;
        
        // If we have cached images and it's been less than 6 hours, return them
        if (cachedGalleryImages.length >= limit && (now - lastGalleryFetchTime) < sixHoursMs) {
            // Only return distinct images up to the limit
            const uniqueImages = cachedGalleryImages.filter((img, index, self) => 
                self.findIndex(i => i.id === img.id) === index
            ).slice(0, limit);
            
            console.log(`Returning ${uniqueImages.length} cached gallery images`);
            return uniqueImages;
        }
        
        try {
            // Either we have no cached images, or it's been more than 6 hours
            console.log("Fetching fresh gallery images");
            const response = await api.get<RecentImage[]>(`api/images/recent/?limit=${limit}`);
            
            const fetchedImages = response.data;
            
            // Filter out any duplicate IDs
            const uniqueImages = fetchedImages.filter((img, index, self) => 
                self.findIndex(i => i.id === img.id) === index
            );
            
            // If we have fewer than the limit, we'll just have to use what we got
            const resultImages = uniqueImages.slice(0, limit); 
            
            // Update our cache
            lastGalleryFetchTime = now;
            cachedGalleryImages = resultImages;
            
            return resultImages;
        } catch (error) {
            console.error("Get recent images API error:", error);
            
            // If we have cached images, return them as fallback
            if (cachedGalleryImages.length > 0) {
                console.log("Using cached images as fallback");
                return cachedGalleryImages.slice(0, limit);
            }
            
            // Last resort: return empty array and let the UI handle it
            return [];
        }
    },
    
    // Clear a specific image from the local cache (for when an image is deleted)
    removeImageFromCache: (imageId: number): void => {
        if (cachedGalleryImages.length > 0) {
            cachedGalleryImages = cachedGalleryImages.filter(img => img.id !== imageId);
            console.log(`Removed image ${imageId} from cache. Remaining: ${cachedGalleryImages.length}`);
        }
    },
    
    // Force refresh the gallery cache
    refreshGalleryCache: async (limit: number = 12): Promise<RecentImage[]> => {
        try {
            console.log("Forcing refresh of gallery images");
            const response = await api.get<RecentImage[]>(`api/images/recent/?limit=${limit * 2}`);
            
            // Get twice as many to have replacements
            const fetchedImages = response.data;
            
            // Filter out any duplicate IDs
            const uniqueImages = fetchedImages.filter((img, index, self) => 
                self.findIndex(i => i.id === img.id) === index
            );
            
            // Update our cache with all fetched images
            lastGalleryFetchTime = Date.now();
            cachedGalleryImages = uniqueImages;
            
            // Return just what was requested
            return uniqueImages.slice(0, limit);
        } catch (error) {
            console.error("Failed to refresh gallery cache:", error);
            throw error;
        }
    },

    // Download image
    downloadImage: async (imageId: number, token: string): Promise<Blob> => {
        try {
            const response = await api.get<Blob>(`api/images/download/${imageId}/?token=${token}`, {
                responseType: 'blob',
            });
            return response.data;
        } catch (error) {
            console.error("Download image API error:", error);
            throw error;
        }
    },

    // Create a function to fetch a replacement image
    fetchReplacementImage: async (index: number): Promise<RecentImage | null> => {
        try {
            // Fetch one additional image beyond what we already have
            const response = await api.get<RecentImage[]>(`api/images/recent/?limit=1&skip=${12 + index}`);
            if (response.data && response.data.length > 0) {
                return response.data[0];
            }
            return null;
        } catch (error) {
            console.error("Failed to fetch replacement image:", error);
            return null;
        }
    },

    // Helper to trigger download in browser
    downloadAndSaveImage: async (imageId: number, token: string, filename?: string) => {
        try {
            const blob = await ImageService.downloadImage(imageId, token);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || `Transformed-image-${imageId}.jpg`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url); // Clean up memory
        } catch (error) {
            console.error("Failed to download and save image:", error);
            throw error;
        }
    },
};

export default ImageService;