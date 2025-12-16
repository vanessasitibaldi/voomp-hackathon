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
    name: 'Oferta PNE 3.0 | Julho/25',
    value: 1997.00,
    currency: 'BRL',
    installments: 12,
    installmentValue: 199.70
  };

  const sendEvent = async (eventType: EventPayload['eventType'], hasError = false) => {
   
    try {
      const payload: EventPayload = {
        userId,
        userPhone: formData.phone || '',
        userName: productData.name || '',
        eventType,
        productName: productData.name || '',
        cartValue: productData.value || 0,
        currency: productData.currency || 'BRL',
        hasError,
        source: 'checkout_page',
      };
 console.log('>>>>> payload:', payload);
      await api.sendEvent(payload);
      console.log(`✅ Evento ${eventType} enviado`);
    } catch (error) {
      console.error(`❌ Erro ao enviar evento ${eventType}:`, error);
    }
  };

  useEffect(() => {
    sendEvent('cart');
  }, []);

  // Quando entra no checkout
  const handleBeginCheckout = () => {
    setStep(2);
    sendEvent('begin_checkout');
  };

  // Quando adiciona info de pagamento
  const handleAddPaymentInfo = async () => {
    await sendEvent('add_payment_info');
    setStep(3);
  };

  // Quando finaliza compra
  const handlePurchase = async (hasError = false) => {
    setLoading(true);
    try {
      await sendEvent('purchase', hasError);
      if (!hasError) {
        alert('Compra realizada com sucesso!');
        // Reset form
        setStep(1);
        setFormData({});
      }
    } catch (error) {
      console.error('Erro ao finalizar compra:', error);
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
              onNext={handleBeginCheckout}
            />
          )}

          {/* Passo 2: Endereço */}
          {step === 2 && (
            <Address
              data={formData}
              onChange={setFormData}
              onBack={() => setStep(1)}
              onNext={handleAddPaymentInfo}
            />
          )}

          {/* Passo 3: Pagamento */}
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
