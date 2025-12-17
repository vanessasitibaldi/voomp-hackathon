import { OrderSummaryProps } from "@/types";
import { DsButton, DsTextField, DsTypography } from "@ds-cola/react";

export default function OrderSummary({
  productData,
  discountCode,
}: OrderSummaryProps) {
  const formatBRL = (value: number) =>
    value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return (
    <div className="order-summary-container">
      <div>
        <div className="order-summary-header">
          <img src="/secure.svg" alt="Compra 100% Segura" />
          <DsTypography variant="title-small" weight="fontWeight-bold">
            Compra 100% Segura
          </DsTypography>
        </div>

        <div className="order-summary">
          <div className="order-summary-title">
            <DsTypography variant="title-small" weight="fontWeight-bold">
              Detalhes da compra
            </DsTypography>

            <img
              src="/banner_details.png"
              alt="Banner do produto como vender seu peixe"
            />
            <DsTypography variant="body-large" weight="fontWeight-medium">
              {productData.name}
            </DsTypography>
          </div>

          <div className="order-summary-price">
            <span>de: R$ {formatBRL(productData.fullPrice)}</span>

            {discountCode && (
              <div>
                <span>Cupom aplicado</span>
                <strong>{discountCode}</strong>
              </div>
            )}

            <div className="price">
              <DsTypography variant="title-small" weight="fontWeight-medium">
                por:
              </DsTypography>
              <DsTypography variant="title-large" weight="fontWeight-bold">
                R$ {formatBRL(productData.value)}
              </DsTypography>
            </div>
          </div>
        </div>
      </div>

      <div className="order-summary-cupom">
        <DsTypography variant="title-small" weight="fontWeight-semibold">
          Cupom de desconto
        </DsTypography>
        <div className="cupom-field">
          <div className="form-group">
            <input
              type="text"
              name="cupom"
              value={discountCode || ""}
              placeholder="Insira seu cupom"
            />
          </div>
          <DsButton
            value="Aplicar"
            variant="contained"
            color="secondary"
            size="large"
            dataTestId="button-coupom"
            fullWidth
          />
        </div>
      </div>

      <div className="order-summary-button">
        <DsButton
          value="Finalizar compra"
          color="success"
          variant="contained"
          dataTestId="button-primary"
          size="large"
          fullWidth
        />
      </div>

      <div>
        <DsTypography
          variant="caption"
          weight="fontWeight-regular"
          color="surface-onSurfaceVariant"
        >
          Ao clicar em 'Comprar agora', eu concordo (i) que a Voomp Creators
          está processando este pedido em nome de In this Together (ii) com os
          Termos (iii) que li e estou ciente da Política de Privacidade e (iv)
          que sou maior de idade ou autorizado e acompanhado por um tutor legal.
        </DsTypography>
      </div>
    </div>
  );
}
