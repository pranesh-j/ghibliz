// src/services/paymentService.ts
import api from './api';

export interface PricingPlan {
  id: number;
  name: string;
  credits: number;
  price_inr: number;
  is_active: boolean;
}

export interface Payment {
  id: number;
  amount: number;
  currency: string;
  credits_purchased: number;
  payment_method: string;
  transaction_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_blocked: boolean;
}

const PaymentService = {
  // Get all pricing plans
  getPricingPlans: async (): Promise<PricingPlan[]> => {
    const response = await api.get<PricingPlan[]>('/payments/plans/');
    return response.data;
  },
  
  // Create a payment order
  createPayment: async (planId: number): Promise<Payment> => {
    const response = await api.post<Payment>('/payments/create/', { plan_id: planId });
    return response.data;
  },
  
  // Verify payment with transaction ID
  verifyPaymentWithTransactionId: async (paymentId: number, transactionId: string): Promise<Payment> => {
    const response = await api.post<Payment>(`/payments/${paymentId}/verify/`, { 
      transaction_id: transactionId 
    });
    return response.data;
  },
  
  // Verify payment with screenshot
  verifyPaymentWithScreenshot: async (paymentId: number, screenshot: File): Promise<Payment> => {
    const formData = new FormData();
    formData.append('screenshot', screenshot);
    
    const response = await api.post<Payment>(`/payments/${paymentId}/verify/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Get payment status
  getPaymentStatus: async (paymentId: number): Promise<Payment> => {
    const response = await api.get<Payment>(`/payments/${paymentId}/status/`);
    return response.data;
  },
  
  // Get user payment history
  getUserPayments: async (): Promise<Payment[]> => {
    const response = await api.get<Payment[]>('/payments/history/');
    return response.data;
  },
  
  // Generate UPI payment link
  generateUpiLink: (upiId: string, amount: number, name: string, paymentId: number): string => {
    const encodedName = encodeURIComponent(name);
    return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount}&cu=INR&tn=Ghibliz_Payment_${paymentId}`;
  }
};

export default PaymentService;