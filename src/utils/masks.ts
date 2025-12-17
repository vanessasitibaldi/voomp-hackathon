export const masks = {
  cardNumber: (value: string) => 
    value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim(),
  
  cpf: (value: string) => 
    value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
  
  cardExpiry: (value: string) => 
    value.replace(/\D/g, '').replace(/(\d{2})(\d{2})/, '$1/$2'),
  
  phone: (value: string) => 
    value.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'),
  
  cvv: (value: string) => 
    value.replace(/\D/g, '').slice(0, 4)
};