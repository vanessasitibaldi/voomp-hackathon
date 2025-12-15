interface PersonalDataProps {
  data: any;
  onChange: (data: any) => void;
  onNext: () => void;
}

export default function PersonalData({ data, onChange, onNext }: PersonalDataProps) {
  const handleChange = (field: string, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.fullName && data.email && data.phone && data.cpf) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-step">
      <h3>01 Dados pessoais</h3>
      
      <div className="form-group">
        <label>Nome Completo</label>
        <input
          type="text"
          value={data.fullName || ''}
          onChange={(e) => handleChange('fullName', e.target.value)}
          placeholder="Digite seu nome completo"
          required
        />
      </div>

      <div className="form-group">
        <label>E-mail</label>
        <input
          type="email"
          value={data.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="E-mail que receberá o produto"
          required
        />
      </div>

      <div className="form-group">
        <label>Telefone</label>
        <div className="phone-input">
          <select>
            <option>+55</option>
          </select>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="Número do telefone"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>CPF ou CNPJ</label>
        <input
          type="text"
          value={data.cpf || ''}
          onChange={(e) => handleChange('cpf', e.target.value)}
          placeholder="Doc. do titular da compra"
          required
        />
      </div>

      <button type="submit" className="btn-primary">Continuar</button>
    </form>
  );
}
