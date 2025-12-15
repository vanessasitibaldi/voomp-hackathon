interface OrderSummaryProps {
  productData: {
    name: string;
    value: number;
    currency: string;
  };
  discountCode?: string;
}

export default function OrderSummary({ productData, discountCode }: OrderSummaryProps) {
  return (
    <div className="order-summary">
      <h3>Resumo do Pedido</h3>
      
      <div className="order-item">
        <div>
          <strong>Você está assinando</strong>
          <p>{productData.name}</p>
        </div>
      </div>

      <div className="order-item">
        <span>Total do pedido</span>
        <strong>R$ {productData.value.toFixed(2).replace('.', ',')}</strong>
      </div>

      {discountCode && (
        <div className="order-item" style={{ color: '#198754' }}>
          <span>Cupom aplicado</span>
          <strong>{discountCode}</strong>
        </div>
      )}

      <div className="order-total">
        <span>Total</span>
        <span>R$ {productData.value.toFixed(2).replace('.', ',')}</span>
      </div>

      <div style={{ marginTop: '24px', fontSize: '14px', color: '#666' }}>
        <p><strong>Autor:</strong> Profinho Cursos e Treinamentos</p>
        <p style={{ marginTop: '8px' }}>
          <strong>E-mail:</strong> contato@professorviniciusoliveira.com.br
        </p>
        <p style={{ marginTop: '8px' }}>
          <strong>Telefone:</strong> (21) 97092-2988
        </p>
      </div>

      <div style={{ marginTop: '24px', fontSize: '12px', color: '#999' }}>
        <p>✓ Compra SEGURA</p>
        <p>✓ Produto REVISADO</p>
        <p>✓ Dados PROTEGIDOS</p>
      </div>
    </div>
  );
}
