import { DsTextField, DsTypography } from "@ds-cola/react";
import { masks } from "@/utils/masks";
import { validation } from "@/utils/validation";
interface PersonalDataProps {
  data: any;
  onChange: (data: any) => void;
  onNext: () => void;
}

export default function PersonalData({
  data,
  onChange,
  onNext,
}: PersonalDataProps) {
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
    if (validation.isPersonalDataValid(data)) {
      onNext();
    }
  };

  return (
    <form className="checkout-step">
      <div className="checkout-step-header">
        <img src="/step1.png" alt="Passo 1" aria-hidden="true" />
        <DsTypography variant="title-small" weight="fontWeight-bold">
          Insira seus dados pessoais
        </DsTypography>
      </div>

      <div className="form-row-two">
        <div className="form-group">
          <label>Nome Completo *</label>
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={data.fullName || ""}
            onChange={(e) => handleChange("fullName", e.target.value)}
            onBlur={(e) => handleBlur(e, "fullName")}
            placeholder="Digite seu nome completo"
            required
          />
        </div>

        <div className="form-group">
          <label>E-mail *</label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={data.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={(e) => handleBlur(e, "email")}
            placeholder="E-mail que receberá o produto"
            required
          />
        </div>

        <div className="form-group">
          <label>Telefone *</label>
          <input
            type="tel"
            name="tel"
            autoComplete="tel"
            value={data.phone || ""}
            onChange={(e) => handleChange("phone", masks.phone(e.target.value))}
            onBlur={(e) => handleBlur(e, "phone")}
            placeholder="(11) 99999-9999"
            maxLength={15}
            required
          />
        </div>

        <div className="form-group">
          <label>CPF ou CNPJ *</label>
          <input
            type="text"
            name="cpf"
            value={data.cpf || ""}
            onChange={(e) => handleChange("cpf", masks.cpf(e.target.value))}
            onBlur={(e) => handleBlur(e, "cpf")}
            placeholder="000.000.000-00"
            maxLength={14}
            required
          />
        </div>
      </div>

      {/* <button type="submit" className="btn-primary">
        Continuar
      </button> */}
    </form>
  );
}
