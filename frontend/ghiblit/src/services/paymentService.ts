import api from './api';

interface PricingPlan {
    id: number;
    name: string;
    credits: number;
    price_inr: number;
    price_usd: number; 
    region: string;
    display_price?: string; 
    is_active: boolean;
}

interface CreatePaymentResponse {
    payment_id: number;
    dodo_payment_id: string;
    payment_url: string;
    amount: number;
    credits: number;
    status: string;
}

interface PaymentStatusResponse {
    payment_id: number;
    status: string;
    credits_purchased?: number;
    credit_balance?: number;
    message?: string;
    error?: string;
}

const paymentService = {
    getPricingPlans: async (): Promise<PricingPlan[]> => {
        try {
            const response = await api.get<PricingPlan[]>('api/payments/plans/');
            return response.data;
        } catch (error) {
            console.error("Failed to fetch pricing plans:", error);
            throw error;
        }
    },

    createPayment: async (planId: number): Promise<CreatePaymentResponse> => {
        try {
            const response = await api.post<CreatePaymentResponse>('api/payments/create/', {
                plan_id: planId,
            });
            return response.data;
        } catch (error) {
            console.error("Failed to create payment:", error);
            throw error;
        }
    },

    checkPaymentStatus: async (paymentId: number): Promise<PaymentStatusResponse> => {
        try {
            const response = await api.get<PaymentStatusResponse>(`api/payments/${paymentId}/status/`);
            return response.data;
        } catch (error) {
            console.error("Failed to check payment status:", error);
            throw error;
        }
    },

    getPaymentHistory: async (): Promise<any[]> => {
        try {
            const response = await api.get<any[]>('api/payments/history/');
            return response.data;
        } catch (error) {
            console.error("Failed to fetch payment history:", error);
            throw error;
        }
    }
};

export default paymentService;