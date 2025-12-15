import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface EventPayload {
  userId: string;
  userPhone: string;
  userName?: string;
  eventType: 'cart' | 'begin_checkout' | 'add_payment_info' | 'purchase';
  productId?: string;
  productName?: string;
  productCategory?: string;
  cartValue?: number;
  currency?: string;
  paymentMethod?: string;
  paymentGateway?: string;
  installments?: number;
  discountCode?: string;
  discountValue?: number;
  error?: {
    code?: string;
    message?: string;
    type?: string;
    gateway?: string;
    paymentMethod?: string;
  };
  hasError?: boolean;
  source?: string;
  campaign?: string;
  metadata?: Record<string, any>;
}

export const api = {
  sendEvent: async (event: EventPayload) => {
    const response = await axios.post(`${API_URL}/webhook/event`, event);
    return response.data;
  },
  
  getStats: async () => {
    const response = await axios.get(`${API_URL}/stats`);
    return response.data;
  },
  
  getHealth: async () => {
    const response = await axios.get(`${API_URL}/health`);
    return response.data;
  }
};
