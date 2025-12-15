import { PurchaseStatus } from "@/constants";

export interface PaymentError {
  code?: string;
  message?: string;
  type?: 'payment' | 'validation' | 'network' | 'gateway' | 'unknown';
  gateway?: string;
  paymentMethod?: string;
}

export interface PurchaseEvent {
  userId: string;
  userPhone: string;
  userName?: string;
  eventType: 'cart' | 'begin_checkout' | 'add_payment_info' | 'purchase';
  status: PurchaseStatus;
  
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
  
  error?: PaymentError;
  hasError?: boolean;
  
  source?: string;
  campaign?: string;
  
  timestamp: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface CartData {
  id: string;
  userId: string;
  userPhone: string;
  userName?: string;
  status: PurchaseStatus;
  createdAt: Date;
  lastEventAt: Date;
  
  productId?: string;
  productName?: string;
  cartValue?: number;
  currency?: string;
  
  source?: string;
  campaign?: string;
  
  hasErrors?: boolean;
  errorCount?: number;
  lastError?: PaymentError;
  
  events: PurchaseEvent[];
}
