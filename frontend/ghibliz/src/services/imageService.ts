// src/services/imageService.ts
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

const ImageService = {
    // Transform image
    transformImage: async (imageFile: File): Promise<ImageTransformResponse> => {
        const formData = new FormData();
        formData.append('image', imageFile);

        try {
            // --- FIX: Removed leading /api/ ---
            const response = await api.post<ImageTransformResponse>('transform/', formData); // Content-Type is set by interceptor
            return response.data;
        } catch (error: any) {
            console.error("Image transform API error:", error.response?.data || error.message);
             // Re-throw the error to allow the calling component (page.tsx) to handle specific status codes (like 402)
             throw error;
        }
    },

    // Get recent images
    getRecentImages: async (limit: number = 6): Promise<RecentImage[]> => {
        try {
            // --- FIX: Removed leading /api/ ---
            const response = await api.get<RecentImage[]>(`images/recent/?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error("Get recent images API error:", error);
            // Return empty array or throw error based on how you want to handle this
            return [];
        }
    },

    // Download image (if using backend endpoint)
    downloadImage: async (imageId: number, token: string): Promise<Blob> => {
        try {
            // --- FIX: Removed leading /api/ ---
            // Adjust the endpoint if needed, e.g., 'images/download/{imageId}/?token={token}'
            const response = await api.get<Blob>(`images/download/${imageId}/?token=${token}`, {
                responseType: 'blob', // Important: expect binary data
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


    // Share image (example, if backend provides a share URL)
    shareImage: async (imageId: number): Promise<ShareResponse> => {
        try {
             // --- FIX: Removed leading /api/ ---
             // Replace with your actual share endpoint if you have one
            const response = await api.post<ShareResponse>(`images/${imageId}/share/`, {}); // Example POST
            // Or GET if it just retrieves a URL:
            // const response = await api.get<ShareResponse>(`/api/images/${imageId}/share/`);
            return response.data;
        } catch (error) {
            console.error("Share image API error:", error);
            throw error;
        }
    },
};

export default ImageService;