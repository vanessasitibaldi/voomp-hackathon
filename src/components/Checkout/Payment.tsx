import { PaymentProps } from "@/types";
import { DsTypography } from "@ds-cola/react";
import { useState } from "react";
import { masks } from "@/utils/masks";
import { validation } from "@/utils/validation";

export default function Payment({
  data,
  onChange,
  productData,
  // onBack,
  onSubmit,
  loading,
}: PaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<
    "credit_card" | "boleto" | "pix" | "paypal"
  >("credit_card");
  const [simulateError, setSimulateError] = useState(false);

  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>, field: string) => {
    if (e.target.value && e.target.value !== data[field]) {
      handleChange(field, e.target.value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(simulateError);
  };

  const isPersonalDataValid = validation.isPersonalDataValid(data);

  return (
    <form
      onSubmit={handleSubmit}
      className={`checkout-step ${!isPersonalDataValid ? "disabled" : ""}`}
    >
      <div className="checkout-step-header">
        <img src="/step2.png" alt="Passo 2" aria-hidden="true" />
        <DsTypography variant="title-small" weight="fontWeight-bold">
          Método de pagamento
        </DsTypography>
      </div>

      <div className="payment-methods">
        <button
          type="button"
          className={`${paymentMethod === "credit_card" ? "active" : ""} ${
            !isPersonalDataValid ? "disabled" : ""
          }`}
          onClick={() => {
            setPaymentMethod("credit_card");
            handleChange("paymentMethod", "credit_card");
          }}
          disabled={!isPersonalDataValid}
        >
          <img src="/credit_card.png" alt="Cartão de crédito" />
          <p>Cartão</p>
        </button>

        <button
          type="button"
          className={paymentMethod === "boleto" ? "active" : ""}
          onClick={() => {
            setPaymentMethod("boleto");
            handleChange("paymentMethod", "boleto");
          }}
          disabled
        >
          <img src="/barcode.svg" alt="Boleto bancário" />
          <p>Boleto</p>
        </button>

        <button
          type="button"
          className={paymentMethod === "pix" ? "active" : ""}
          onClick={() => {
            setPaymentMethod("pix");
            handleChange("paymentMethod", "pix");
          }}
          disabled
        >
          <img src="/pix.svg" alt="Pagamento via PIX" />
          <p>PIX</p>
        </button>

        <button
          type="button"
          className={paymentMethod === "paypal" ? "active" : ""}
          onClick={() => {
            setPaymentMethod("paypal");
            handleChange("paymentMethod", "paypal");
          }}
          disabled
        >
          <img src="/pay-pal.svg" alt="Pagamento via PayPal" />
          <p>PayPal</p>
        </button>
      </div>
      <div className="form-row-two">
        {paymentMethod === "credit_card" && (
          <>
            <div className="form-group">
              <label htmlFor="cc-number">Número do cartão *</label>
              <input
                type="text"
                name="cc-number"
                autoComplete="cc-number"
                value={data.cardNumber || ""}
                onChange={(e) =>
                  handleChange("cardNumber", masks.cardNumber(e.target.value))
                }
                disabled={!isPersonalDataValid}
                onBlur={(e) => handleBlur(e, "cardNumber")}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cc-name">Titular do cartão *</label>
              <input
                type="text"
                name="cc-name"
                autoComplete="cc-name"
                value={data.cardName || ""}
                onChange={(e) => handleChange("cardName", e.target.value)}
                disabled={!isPersonalDataValid}
                onBlur={(e) => handleBlur(e, "cardName")}
                placeholder="NOME COMPLETO"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cc-due-date">
                Data de vencimento do cartão *
              </label>
              <input
                type="text"
                name="cc-due-date"
                value={data.cardDueDate || ""}
                onChange={(e) =>
                  handleChange("cardDueDate", masks.cardExpiry(e.target.value))
                }
                disabled={!isPersonalDataValid}
                onBlur={(e) => handleBlur(e, "cardDueDate")}
                placeholder="12/34"
                maxLength={5}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cc-csc">CVV *</label>
              <input
                type="text"
                name="cc-csc"
                autoComplete="cc-csc"
                value={data.cardCvv || ""}
                onChange={(e) =>
                  handleChange("cardCvv", masks.cvv(e.target.value))
                }
                disabled={!isPersonalDataValid}
                onBlur={(e) => handleBlur(e, "cardCvv")}
                placeholder="123"
                maxLength={4}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="installments">Parcelas</label>
              <select
                value={data.installments || productData.installments}
                onChange={(e) =>
                  handleChange("installments", parseInt(e.target.value))
                }
                disabled={!isPersonalDataValid}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}x de R$ {(productData.value / num).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Checkbox para simular erro (apenas para testes)
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
          {loading ? "Processando..." : "Comprar agora"}
        </button>
      </div> */}
    </form>
  );
}
