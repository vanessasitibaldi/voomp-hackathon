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
