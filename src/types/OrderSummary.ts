export interface OrderSummaryProps {
  productData: {
    fullPrice: number;
    name: string;
    value: number;
    currency: string;
  };
  discountCode?: string;
  formData?: any;
  onPurchase?: () => void;
  loading?: boolean;
}
