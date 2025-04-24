import api from './api';

export interface RecentImage {
    id: number;
    original: string | null;
    processed: string | null;
    created_at?: string;
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

let lastGalleryFetchTime = 0;
let cachedGalleryImages: RecentImage[] = [];

const ImageService = {
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
    
    getRecentImages: async (limit: number = 12): Promise<RecentImage[]> => {
        const now = Date.now();
        const sixHoursMs = 6 * 60 * 60 * 1000;
        
        if (cachedGalleryImages.length >= limit && (now - lastGalleryFetchTime) < sixHoursMs) {
            const uniqueImages = cachedGalleryImages.filter((img, index, self) => 
                self.findIndex(i => i.id === img.id) === index
            ).slice(0, limit);
            
            console.log(`Returning ${uniqueImages.length} cached gallery images`);
            return uniqueImages;
        }
        
        try {
            console.log("Fetching fresh gallery images");
            const response = await api.get<RecentImage[]>(`api/images/recent/?limit=${limit}`);
            
            const fetchedImages = response.data;
            const uniqueImages = fetchedImages.filter((img, index, self) => 
                self.findIndex(i => i.id === img.id) === index
            );
            
            const resultImages = uniqueImages.slice(0, limit); 
            
            lastGalleryFetchTime = now;
            cachedGalleryImages = resultImages;
            
            return resultImages;
        } catch (error) {
            console.error("Get recent images API error:", error);
            
            if (cachedGalleryImages.length > 0) {
                console.log("Using cached images as fallback");
                return cachedGalleryImages.slice(0, limit);
            }
            
            return [];
        }
    },
    
    removeImageFromCache: (imageId: number): void => {
        if (cachedGalleryImages.length > 0) {
            cachedGalleryImages = cachedGalleryImages.filter(img => img.id !== imageId);
            console.log(`Removed image ${imageId} from cache. Remaining: ${cachedGalleryImages.length}`);
        }
    },
    
    refreshGalleryCache: async (limit: number = 12): Promise<RecentImage[]> => {
        try {
            console.log("Forcing refresh of gallery images");
            const response = await api.get<RecentImage[]>(`api/images/recent/?limit=${limit * 2}`);
            
            const fetchedImages = response.data;
            const uniqueImages = fetchedImages.filter((img, index, self) => 
                self.findIndex(i => i.id === img.id) === index
            );
            
            lastGalleryFetchTime = Date.now();
            cachedGalleryImages = uniqueImages;
            
            return uniqueImages.slice(0, limit);
        } catch (error) {
            console.error("Failed to refresh gallery cache:", error);
            throw error;
        }
    },

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

    fetchReplacementImage: async (index: number): Promise<RecentImage | null> => {
        try {
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
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to download and save image:", error);
            throw error;
        }
    },
};

export default ImageService;