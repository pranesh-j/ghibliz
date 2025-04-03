// src/services/paymentService.ts
import api from './api';

// Interfaces matching backend serializers/models
interface PricingPlan {
    id: number;
    name: string;
    credits: number;
    price_inr: number; // Assuming INR price is primary for frontend display
    is_active: boolean;
}

interface PaymentSessionResponse {
    session_id: number;
    amount: number;
    plan_name: string;
    expires_at: string; // ISO format string
    upi_link: string;
    qr_code_data: string; // base64 data URI
    reference_code?: string; // Optional, might not be returned
}

interface VerificationResponse {
    message: string;
    credits_added?: number;
    total_credits?: number;
    // Include other fields if backend sends more on verification success/failure
}


const paymentService = {
    // Get active pricing plans
    getPricingPlans: async (): Promise<PricingPlan[]> => {
        try {
            // --- FIX: Removed leading /api/ ---
            const response = await api.get<PricingPlan[]>('payments/plans/');
            return response.data;
        } catch (error) {
            console.error("Get pricing plans API error:", error);
            throw error;
        }
    },

    // Create a payment session
    createPaymentSession: async (planId: number): Promise<PaymentSessionResponse> => {
        try {
            // --- FIX: Removed leading /api/ ---
            const response = await api.post<PaymentSessionResponse>('payments/sessions/create/', {
                plan_id: planId,
            });
            return response.data;
        } catch (error) {
            console.error("Create payment session API error:", error);
            throw error;
        }
    },

    // Verify payment using screenshot
    verifyPayment: async (sessionId: number, screenshotFile: File): Promise<VerificationResponse> => {
        const formData = new FormData();
        formData.append('screenshot', screenshotFile);

        try {
            // --- FIX: Removed leading /api/ ---
            const response = await api.post<VerificationResponse>(`payments/sessions/${sessionId}/verify/`, formData); // Content-Type set by interceptor
            return response.data;
        } catch (error) {
            console.error("Verify payment API error:", error);
            throw error;
        }
    },

    // Add other payment-related API calls if needed, e.g., get payment history
    getPaymentHistory: async (): Promise<any[]> => { // Use a specific Payment type if defined
        try {
             // --- FIX: Removed leading /api/ ---
            const response = await api.get<any[]>('payments/history/');
            return response.data;
        } catch (error) {
            console.error("Get payment history API error:", error);
            throw error;
        }
    },
};

export default paymentService;