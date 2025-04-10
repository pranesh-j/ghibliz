import api from './api';

interface PricingPlan {
    id: number;
    name: string;
    credits: number;
    price_inr: number;
    is_active: boolean;
}

interface PaymentSessionResponse {
    session_id: number;
    amount: number;
    plan_name: string;
    expires_at: string;
    upi_link: string;
    qr_code_data: string;
    reference_code?: string;
}

interface VerificationResponse {
    message: string;
    credits_added?: number;
    total_credits?: number;
}

const paymentService = {
    getPricingPlans: async (): Promise<PricingPlan[]> => {
        try {
            const response = await api.get<PricingPlan[]>('api/payments/plans/');
            return response.data;
        } catch (error) {
            console.error("Get pricing plans API error:", error);
            throw error;
        }
    },

    createPaymentSession: async (planId: number): Promise<PaymentSessionResponse> => {
        try {
            const response = await api.post<PaymentSessionResponse>('api/payments/sessions/create/', {
                plan_id: planId,
            });
            return response.data;
        } catch (error) {
            console.error("Create payment session API error:", error);
            throw error;
        }
    },

    verifyPayment: async (sessionId: number, screenshotFile: File): Promise<VerificationResponse> => {
        const formData = new FormData();
        formData.append('screenshot', screenshotFile);

        try {
            const response = await api.post<VerificationResponse>(`payments/sessions/${sessionId}/verify/`, formData);
            return response.data;
        } catch (error) {
            console.error("Verify payment API error:", error);
            throw error;
        }
    },

    getPaymentHistory: async (): Promise<any[]> => {
        try {
            const response = await api.get<any[]>('payments/history/');
            return response.data;
        } catch (error) {
            console.error("Get payment history API error:", error);
            throw error;
        }
    },
};

export default paymentService;