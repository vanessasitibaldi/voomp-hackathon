import { AddressProps } from '../../types';

export default function Address({ data, onChange, onBack, onNext }: AddressProps) {
  const handleChange = (field: string, value: string) => {
    onChange({ ...data, [field]: value });
  };

  // Captura valores do autocomplete do navegador
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>, field: string) => {
    if (e.target.value && e.target.value !== data[field]) {
      handleChange(field, e.target.value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.cep && data.address && data.number && data.city && data.state) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-step">
      <h3>02 Endereço de entrega</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label>CEP</label>
          <input
            type="text"
            name="postal-code"
            autoComplete="postal-code"
            value={data.cep || ''}
            onChange={(e) => handleChange('cep', e.target.value)}
            onBlur={(e) => handleBlur(e, 'cep')}
            placeholder="CEP"
            required
          />
        </div>
        <div className="form-group">
          <label>Endereço</label>
          <input
            type="text"
            name="address"
            autoComplete="street-address"
            value={data.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            onBlur={(e) => handleBlur(e, 'address')}
            placeholder="Informe o endereço"
            required
          />
        </div>
        <div className="form-group">
          <label>Número</label>
          <input
            type="text"
            name="address-number"
            value={data.number || ''}
            onChange={(e) => handleChange('number', e.target.value)}
            onBlur={(e) => handleBlur(e, 'number')}
            placeholder="Número"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Cidade</label>
          <input
            type="text"
            name="city"
            autoComplete="address-level2"
            value={data.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            onBlur={(e) => handleBlur(e, 'city')}
            placeholder="Cidade"
            required
          />
        </div>
        <div className="form-group">
          <label>Bairro</label>
          <input
            type="text"
            name="neighborhood"
            value={data.neighborhood || ''}
            onChange={(e) => handleChange('neighborhood', e.target.value)}
            onBlur={(e) => handleBlur(e, 'neighborhood')}
            placeholder="Bairro"
            required
          />
        </div>
        <div className="form-group">
          <label>Estado</label>
          <input
            type="text"
            name="state"
            autoComplete="address-level1"
            value={data.state || ''}
            onChange={(e) => handleChange('state', e.target.value)}
            onBlur={(e) => handleBlur(e, 'state')}
            placeholder="Estado"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Complemento</label>
        <input
          type="text"
          name="complement"
          value={data.complement || ''}
          onChange={(e) => handleChange('complement', e.target.value)}
          onBlur={(e) => handleBlur(e, 'complement')}
          placeholder="Complemento do endereço"
        />
      </div>

      <div className="form-actions">
        <button type="button" onClick={onBack} className="btn-secondary">
          Voltar
        </button>
        <button type="submit" className="btn-primary">
          Continuar
        </button>
      </div>
    </form>
  );
}
