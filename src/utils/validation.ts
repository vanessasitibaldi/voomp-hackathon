export const validation = {
  email: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  
  cpf: (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.length === 11;
  },
  
  phone: (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10;
  },
  
  fullName: (name: string) => name.trim().length >= 3,
  
  cardNumber: (cardNumber: string) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    return cleaned.length >= 13;
  },
  
  cardName: (cardName: string) => cardName.trim().length >= 3,
  
  cardExpiry: (expiry: string) => {
    const cleaned = expiry.replace(/\D/g, '');
    return cleaned.length === 4;
  },
  
  cvv: (cvv: string) => {
    const cleaned = cvv.replace(/\D/g, '');
    return cleaned.length >= 3;
  },
  
  isPersonalDataValid: (data: any) => {
    return data.fullName && 
           data.email && 
           data.phone && 
           data.cpf &&
           validation.fullName(data.fullName) &&
           validation.email(data.email) &&
           validation.phone(data.phone) &&
           validation.cpf(data.cpf);
  },
  
  isPaymentDataValid: (data: any) => {
    return data.cardNumber &&
           data.cardName &&
           data.cardDueDate &&
           data.cardCvv &&
           validation.cardNumber(data.cardNumber) &&
           validation.cardName(data.cardName) &&
           validation.cardExpiry(data.cardDueDate) &&
           validation.cvv(data.cardCvv);
  },
  
  isAllDataValid: (data: any) => {
    return validation.isPersonalDataValid(data) && validation.isPaymentDataValid(data);
  }
};