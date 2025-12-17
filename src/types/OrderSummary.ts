export interface OrderSummaryProps {
  productData: {
    fullPrice: number;
    name: string;
    value: number;
    currency: string;
  };
  discountCode?: string;
}
