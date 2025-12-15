import { useState } from 'react';
import { api } from '../../services/api';
import { EventPayload } from '../../types';

export default function EventTester() {
  const [eventType, setEventType] = useState<EventPayload['eventType']>('cart');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    userId: `test_user_${Date.now()}`,
    userPhone: '5511999999999',
    userName: 'João Silva Teste',
    productName: 'Oferta PNE 3.0 | Julho/25',
    cartValue: 1997.00,
    hasError: false
  });

  const handleSendEvent = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const payload: EventPayload = {
        userId: formData.userId,
        userPhone: formData.userPhone,
        userName: formData.userName,
        eventType,
        productName: formData.productName,
        cartValue: formData.cartValue,
        currency: 'BRL',
        hasError: formData.hasError,
        source: 'test_interface',
        campaign: 'test-campaign'
      };

      const result = await api.sendEvent(payload);
      setResponse({ success: true, data: result });
    } catch (error: any) {
      setResponse({ 
        success: false, 
        error: error.response?.data || error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGetStats = async () => {
    setLoading(true);
    try {
      const stats = await api.getStats();
      setResponse({ success: true, data: stats });
    } catch (error: any) {
      setResponse({ 
        success: false, 
        error: error.response?.data || error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-tester">
      <h2>🧪 Testador de Eventos</h2>

      <div className="tester-form">
        <div className="form-group">
          <label>Tipo de Evento</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventPayload['eventType'])}
          >
            <option value="cart">cart</option>
            <option value="begin_checkout">begin_checkout</option>
            <option value="add_payment_info">add_payment_info</option>
            <option value="purchase">purchase</option>
          </select>
        </div>

        <div className="form-group">
          <label>User ID</label>
          <input
            type="text"
            value={formData.userId}
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Telefone</label>
          <input
            type="text"
            value={formData.userPhone}
            onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
            placeholder="5511999999999"
          />
        </div>

        <div className="form-group">
          <label>Nome</label>
          <input
            type="text"
            value={formData.userName}
            onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Produto</label>
          <input
            type="text"
            value={formData.productName}
            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Valor do Carrinho</label>
          <input
            type="number"
            value={formData.cartValue}
            onChange={(e) => setFormData({ ...formData, cartValue: parseFloat(e.target.value) })}
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={formData.hasError}
              onChange={(e) => setFormData({ ...formData, hasError: e.target.checked })}
            />
            Simular Erro
          </label>
        </div>

        <div className="form-actions">
          <button 
            onClick={handleSendEvent} 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Enviando...' : 'Enviar Evento'}
          </button>
          <button 
            onClick={handleGetStats} 
            disabled={loading}
            className="btn-secondary"
          >
            Ver Estatísticas
          </button>
        </div>
      </div>

      {response && (
        <div className={`response ${response.success ? 'success' : 'error'}`}>
          <h3>{response.success ? '✅ Sucesso' : '❌ Erro'}</h3>
          <pre>{JSON.stringify(response.data || response.error, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
