import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CheckoutFormData, EventPayload } from '../../types';
import PersonalData from './PersonalData';
import Address from './Address';
import Payment from './Payment';
import OrderSummary from './OrderSummary';
import { generateUserId } from '../../utils/userId';


export default function CheckoutForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CheckoutFormData>>({});
  const [loading, setLoading] = useState(false);
  
  const [userId] = useState(() => generateUserId());

  const productData = {
    id: 'pne_3_0_julho_2025',
    name: 'Oferta PNE 3.0 | Julho/25',
    author: 'Prof. João Silva',
    type: 'pós-graduação' as const,
    value: 1997.00,
    currency: 'BRL',
    installments: 12,
    installmentValue: 199.70
  };

  // CART - ao entrar na tela
  useEffect(() => {
    const sendCartEvent = async () => {
      try {
        await api.sendEvent({
          userId,
          userPhone: '',
          eventType: 'cart',
          productId: productData.id,
          productName: productData.name,
          productAuthor: productData.author,
          productType: productData.type,
          cartValue: productData.value,
          currency: productData.currency
        });
        console.log('📦 CART enviado');
      } catch (error) {
        console.error('❌ Erro cart:', error);
      }
    };
    sendCartEvent();
  }, []);

  // BEGIN_CHECKOUT - ao clicar continuar no endereço (passo 2)
  const handleBeginCheckout = async () => {
    try {
      await api.sendEvent({
        userId,
        userPhone: formData.phone || '',
        userName: formData.fullName || '',
        userEmail: formData.email || '',
        userCPF: formData.cpf || '',
        eventType: 'begin_checkout',
        productId: productData.id,
        productName: productData.name,
        productAuthor: productData.author,
        productType: productData.type,
        cartValue: productData.value,
        currency: productData.currency
      });
      console.log('🛒 BEGIN_CHECKOUT enviado');
      setStep(3);
    } catch (error) {
      console.error('❌ Erro begin_checkout:', error);
      setStep(3);
    }
  };

  // ADD_PAYMENT_INFO + PURCHASE - ao clicar "comprar agora" (passo 3)
  const handlePurchase = async () => {
    setLoading(true);
    try {
      // 1. Envia ADD_PAYMENT_INFO
      await api.sendEvent({
        userId,
        userPhone: formData.phone || '',
        userName: formData.fullName || '',
        userEmail: formData.email || '',
        userCPF: formData.cpf || '',
        eventType: 'add_payment_info',
        productId: productData.id,
        productName: productData.name,
        productAuthor: productData.author,
        productType: productData.type,
        cartValue: productData.value,
        currency: productData.currency,
        paymentMethod: formData.paymentMethod || 'credit_card',
        installments: productData.installments,
        hasInstallments: productData.installments > 1
      });
      console.log('💳 ADD_PAYMENT_INFO enviado');

      // 2. Simula chamada API de pagamento
      const paymentSuccess = Math.random() > 0.2; // 80% sucesso

      if (paymentSuccess) {
        // SUCCESS: envia PURCHASE
        const discountValue = formData.discountCode ? productData.value * 0.1 : 0;
        const totalValue = productData.value - discountValue;

        await api.sendEvent({
          userId,
          userPhone: formData.phone || '',
          userName: formData.fullName || '',
          userEmail: formData.email || '',
          userCPF: formData.cpf || '',
          eventType: 'purchase',
          productId: productData.id,
          productName: productData.name,
          productAuthor: productData.author,
          productType: productData.type,
          cartValue: productData.value,
          totalValue: totalValue,
          discountValue: discountValue,
          discountCode: formData.discountCode || '',
          currency: productData.currency,
          paymentMethod: formData.paymentMethod || 'credit_card',
          installments: productData.installments,
          hasInstallments: productData.installments > 1
        });
        console.log('✅ PURCHASE enviado');
        
        alert('Compra realizada com sucesso!');
        setStep(1);
        setFormData({});
      } else {
        // ERROR: envia evento de erro
        await api.sendEvent({
          userId,
          userPhone: formData.phone || '',
          userName: formData.fullName || '',
          userEmail: formData.email || '',
          userCPF: formData.cpf || '',
          eventType: 'error',
          productId: productData.id,
          productName: productData.name,
          productAuthor: productData.author,
          productType: productData.type,
          cartValue: productData.value,
          statusCode: 400,
          errorMessage: 'Cartão recusado - saldo insuficiente',
          paymentMethod: formData.paymentMethod || 'credit_card'
        });
        console.log('❌ ERROR enviado');
        
        alert('Erro ao processar pagamento: Cartão recusado');
      }
    } catch (error: any) {
      console.error('❌ Erro ao processar:', error);
      
      // Envia ERROR em caso de exceção
      try {
        await api.sendEvent({
          userId,
          userPhone: formData.phone || '',
          userName: formData.fullName || '',
          eventType: 'error',
          productName: productData.name,
          cartValue: productData.value,
          statusCode: 500,
          errorMessage: error.message || 'Erro desconhecido'
        });
      } catch (e) {
        console.error('Erro ao enviar evento de erro:', e);
      }
      
      alert('Erro ao processar compra. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <h1>voomp creators</h1>
        <h2>COMPRA 100% SEGURA</h2>
      </div>

      <div className="checkout-content">
        <div className="checkout-form">
          {/* Passo 1: Dados Pessoais */}
          {step === 1 && (
            <PersonalData
              data={formData}
              onChange={setFormData}
              onNext={() => setStep(2)}
            />
          )}

          {/* Passo 2: Endereço - BEGIN_CHECKOUT ao continuar */}
          {step === 2 && (
            <Address
              data={formData}
              onChange={setFormData}
              onBack={() => setStep(1)}
              onNext={handleBeginCheckout}
            />
          )}

          {/* Passo 3: Pagamento - ADD_PAYMENT_INFO + PURCHASE ao finalizar */}
          {step === 3 && (
            <Payment
              data={formData}
              onChange={setFormData}
              productData={productData}
              onBack={() => setStep(2)}
              onSubmit={handlePurchase}
              loading={loading}
            />
          )}
        </div>

        <OrderSummary productData={productData} discountCode={formData.discountCode} />
      </div>
    </div>
  );
}
