import { PaymentProps } from '@/types';
import { useState } from 'react';


export default function Payment({ 
  data, 
  onChange, 
  productData, 
  onBack, 
  onSubmit, 
  loading 
}: PaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'boleto'>('credit_card');
  const [simulateError, setSimulateError] = useState(false);

  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // Captura valores do autocomplete do navegador
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>, field: string) => {
    if (e.target.value && e.target.value !== data[field]) {
      handleChange(field, e.target.value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (simulateError) {
      // Simula erro de pagamento para testar remarketing
      onSubmit(true);
    } else {
      onSubmit(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-step">
      <h3>03 Pagamento</h3>

      <div className="payment-methods">
        <button
          type="button"
          className={paymentMethod === 'credit_card' ? 'active' : ''}
          onClick={() => {
            setPaymentMethod('credit_card');
            handleChange('paymentMethod', 'credit_card');
          }}
        >
          Cartão de crédito
        </button>
        <button
          type="button"
          className={paymentMethod === 'boleto' ? 'active' : ''}
          onClick={() => {
            setPaymentMethod('boleto');
            handleChange('paymentMethod', 'boleto');
          }}
        >
          Boleto
        </button>
      </div>

      {paymentMethod === 'credit_card' && (
        <>
          <div className="form-group">
            <label>Número do cartão</label>
            <input
              type="text"
              name="cc-number"
              autoComplete="cc-number"
              value={data.cardNumber || ''}
              onChange={(e) => handleChange('cardNumber', e.target.value)}
              onBlur={(e) => handleBlur(e, 'cardNumber')}
              placeholder="Número do cartão"
              required
            />
          </div>

          <div className="form-group">
            <label>Titular do cartão</label>
            <input
              type="text"
              name="cc-name"
              autoComplete="cc-name"
              value={data.cardName || ''}
              onChange={(e) => handleChange('cardName', e.target.value)}
              onBlur={(e) => handleBlur(e, 'cardName')}
              placeholder="NOME COMPLETO"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Mês</label>
              <input
                type="text"
                name="cc-exp-month"
                autoComplete="cc-exp-month"
                value={data.cardMonth || ''}
                onChange={(e) => handleChange('cardMonth', e.target.value)}
                onBlur={(e) => handleBlur(e, 'cardMonth')}
                placeholder="MM"
                required
              />
            </div>
            <div className="form-group">
              <label>Ano</label>
              <input
                type="text"
                name="cc-exp-year"
                autoComplete="cc-exp-year"
                value={data.cardYear || ''}
                onChange={(e) => handleChange('cardYear', e.target.value)}
                onBlur={(e) => handleBlur(e, 'cardYear')}
                placeholder="AA"
                required
              />
            </div>
            <div className="form-group">
              <label>CVV</label>
              <input
                type="text"
                name="cc-csc"
                autoComplete="cc-csc"
                value={data.cardCvv || ''}
                onChange={(e) => handleChange('cardCvv', e.target.value)}
                onBlur={(e) => handleBlur(e, 'cardCvv')}
                placeholder="CVV"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Parcelas</label>
            <select
              value={data.installments || productData.installments}
              onChange={(e) => handleChange('installments', parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num}x de R$ {(productData.value / num).toFixed(2)}
                </option>
              ))}
            </select>
            <small>*O valor parcelado possui acréscimo.</small>
          </div>
        </>
      )}

      {/* Checkbox para simular erro (apenas para testes) */}
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={simulateError}
            onChange={(e) => setSimulateError(e.target.checked)}
          />
          Simular erro de pagamento (teste remarketing)
        </label>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onBack} className="btn-secondary">
          Voltar
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Processando...' : 'Comprar agora'}
        </button>
      </div>
    </form>
  );
}
