export interface EventPayload {
  userId: string;
  userPhone: string;
  userName?: string;
  userEmail?: string;
  userCPF?: string;
  eventType: 'cart' | 'begin_checkout' | 'add_payment_info' | 'purchase' | 'error';
  
  productId?: string;
  productName?: string;
  productAuthor?: string;
  productType?: 'pós-graduação' | 'curso livre';
  cartValue?: number;
  totalValue?: number;
  currency?: string;
  
  paymentMethod?: string;
  paymentGateway?: string;
  installments?: number;
  hasInstallments?: boolean;
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
  statusCode?: number;
  errorMessage?: string;
  
  source?: string;
  campaign?: string;
  metadata?: Record<string, any>;
}
