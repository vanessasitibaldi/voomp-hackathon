export interface CheckoutFormData {
  // Dados pessoais
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  
  // Endereço
  cep: string;
  address: string;
  number: string;
  complement: string;
  city: string;
  neighborhood: string;
  state: string;
  
  // Pagamento
  paymentMethod: 'credit_card' | 'boleto';
  cardNumber: string;
  cardName: string;
  cardMonth: string;
  cardYear: string;
  cardCvv: string;
  installments: number;
  discountCode: string;
}
export interface AddressProps {
  data: any;
  onChange: (data: any) => void;
  onBack: () => void;
  onNext: () => void;
}
