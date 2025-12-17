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
  
  isPersonalDataValid: (data: any) => {
    return data.fullName && 
           data.email && 
           data.phone && 
           data.cpf &&
           validation.fullName(data.fullName) &&
           validation.email(data.email) &&
           validation.phone(data.phone) &&
           validation.cpf(data.cpf);
  }
};