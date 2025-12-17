export interface PaymentProps {
  data: any;
  onChange: (data: any) => void;
  productData: any;
  // onBack: () => void;
  onSubmit: (hasError: boolean) => void;
  loading: boolean;
}
