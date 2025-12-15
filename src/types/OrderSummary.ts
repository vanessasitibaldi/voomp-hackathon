export interface OrderSummaryProps {
  productData: {
    name: string;
    value: number;
    currency: string;
  };
  discountCode?: string;
}
