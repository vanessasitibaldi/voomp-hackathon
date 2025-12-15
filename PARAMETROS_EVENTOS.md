# 📊 Parâmetros dos Eventos - Documentação Completa

## 🎯 Visão Geral

O sistema agora captura informações detalhadas sobre cada evento, especialmente **erros de pagamento** no `add_payment_info`, permitindo análise profunda dos abandonos.

---

## 📋 Estrutura Completa dos Eventos

### Campos Obrigatórios

```json
{
  "userId": "string",
  "userPhone": "string",
  "eventType": "cart | begin_checkout | add_payment_info | purchase"
}
```

### Campos Opcionais por Categoria

#### 1. Informações do Produto

```json
{
  "productId": "string",
  "productName": "string",
  "productCategory": "string",      // ex: "curso", "ebook", "mentoria"
  "productType": "string",           // ex: "digital", "físico"
  "cartValue": 497.00,
  "currency": "BRL"                 // padrão: "BRL"
}
```

#### 2. Informações de Pagamento ⚠️ IMPORTANTE

```json
{
  "paymentMethod": "string",         // ex: "credit_card", "pix", "boleto"
  "paymentGateway": "string",        // ex: "stripe", "pagarme", "mercadopago"
  "installments": 3,                 // número de parcelas
  "discountCode": "string",          // código de desconto usado
  "discountValue": 50.00             // valor do desconto aplicado
}
```

#### 3. Informações de Erro 🔴 CRÍTICO para Análise

```json
{
  "hasError": true,                  // flag rápido
  "error": {
    "code": "string",                // ex: "CARD_DECLINED", "INSUFFICIENT_FUNDS", "EXPIRED_CARD"
    "message": "string",             // mensagem legível do erro
    "type": "payment | validation | network | gateway | unknown",
    "gateway": "string",             // gateway que retornou o erro
    "paymentMethod": "string"        // método de pagamento que falhou
  }
}
```

#### 4. Informações de Origem (Marketing)

```json
{
  "source": "string",                // ex: "google", "facebook", "direct"
  "campaign": "string",              // nome da campanha
  "utmSource": "string",
  "utmMedium": "string",
  "utmCampaign": "string"
}
```

#### 5. Informações Técnicas

```json
{
  "userAgent": "string",
  "ipAddress": "string",
  "deviceType": "mobile | desktop | tablet | unknown"
}
```

#### 6. Informações de Tempo

```json
{
  "timeOnPage": 120,                 // segundos na página
  "timeSinceLastEvent": 30           // segundos desde último evento
}
```

#### 7. Informações de Checkout

```json
{
  "checkoutStep": "string",          // ex: "shipping", "payment", "review"
  "checkoutUrl": "string"            // URL do checkout
}
```

---

## 🔴 Exemplo: Evento com Erro de Pagamento

Este é o caso mais importante para análise:

```json
{
  "userId": "user123",
  "userPhone": "5511999999999",
  "userName": "João Silva",
  "eventType": "add_payment_info",
  
  "productName": "Curso de Marketing Digital",
  "productCategory": "curso",
  "cartValue": 497.00,
  "currency": "BRL",
  
  "paymentMethod": "credit_card",
  "paymentGateway": "stripe",
  "installments": 3,
  
  "hasError": true,
  "error": {
    "code": "CARD_DECLINED",
    "message": "Cartão recusado pelo banco emissor",
    "type": "payment",
    "gateway": "stripe",
    "paymentMethod": "credit_card"
  },
  
  "checkoutStep": "payment",
  "source": "google",
  "campaign": "curso-marketing-2024"
}
```

---

## 📊 Exemplos de Uso

### Exemplo 1: Evento Cart Simples

```bash
curl -X POST http://localhost:3000/webhook/event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "userPhone": "5511999999999",
    "userName": "João Silva",
    "eventType": "cart",
    "productName": "Curso de Marketing",
    "productCategory": "curso",
    "cartValue": 497.00,
    "source": "google",
    "campaign": "curso-marketing-2024"
  }'
```

### Exemplo 2: Begin Checkout

```bash
curl -X POST http://localhost:3000/webhook/event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "userPhone": "5511999999999",
    "eventType": "begin_checkout",
    "productName": "Curso de Marketing",
    "cartValue": 497.00,
    "checkoutStep": "shipping",
    "checkoutUrl": "https://voomp.com/checkout/abc123",
    "timeOnPage": 120
  }'
```

### Exemplo 3: Add Payment Info COM ERRO (Mais Importante)

```bash
curl -X POST http://localhost:3000/webhook/event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "userPhone": "5511999999999",
    "eventType": "add_payment_info",
    "productName": "Curso de Marketing",
    "cartValue": 497.00,
    "paymentMethod": "credit_card",
    "paymentGateway": "stripe",
    "installments": 3,
    "hasError": true,
    "error": {
      "code": "CARD_DECLINED",
      "message": "Cartão recusado pelo banco emissor",
      "type": "payment",
      "gateway": "stripe",
      "paymentMethod": "credit_card"
    },
    "checkoutStep": "payment"
  }'
```

### Exemplo 4: Purchase Completo

```bash
curl -X POST http://localhost:3000/webhook/event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "userPhone": "5511999999999",
    "eventType": "purchase",
    "productName": "Curso de Marketing",
    "cartValue": 497.00,
    "paymentMethod": "credit_card",
    "paymentGateway": "stripe",
    "installments": 3,
    "discountCode": "DESCONTO10",
    "discountValue": 49.70
  }'
```

---

## 🔍 Códigos de Erro Comuns

### Erros de Pagamento (type: "payment")

- `CARD_DECLINED` - Cartão recusado
- `INSUFFICIENT_FUNDS` - Saldo insuficiente
- `EXPIRED_CARD` - Cartão expirado
- `INVALID_CARD` - Cartão inválido
- `FRAUD_DETECTED` - Fraude detectada
- `PROCESSING_ERROR` - Erro no processamento

### Erros de Validação (type: "validation")

- `INVALID_EMAIL` - Email inválido
- `INVALID_PHONE` - Telefone inválido
- `MISSING_FIELDS` - Campos obrigatórios faltando
- `INVALID_CPF` - CPF inválido

### Erros de Rede (type: "network")

- `TIMEOUT` - Timeout na requisição
- `CONNECTION_ERROR` - Erro de conexão
- `SERVICE_UNAVAILABLE` - Serviço indisponível

### Erros de Gateway (type: "gateway")

- `GATEWAY_ERROR` - Erro no gateway
- `AUTHENTICATION_FAILED` - Falha na autenticação
- `RATE_LIMIT_EXCEEDED` - Limite de requisições excedido

---

## 📈 Dados Enviados para n8n

### Evento: cart_abandoned

```json
{
  "action": "cart_abandoned",
  "cartId": "user123_prod123",
  "userId": "user123",
  "userPhone": "5511999999999",
  "userName": "João Silva",
  "productName": "Curso de Marketing",
  "productCategory": "curso",
  "cartValue": 497.00,
  "currency": "BRL",
  "hoursSinceCreation": 24,
  "status": "cart",
  "source": "google",
  "campaign": "curso-marketing-2024",
  "timeToCheckout": null,
  "createdAt": "2025-12-15T10:00:00.000Z",
  "lastEventAt": "2025-12-15T10:00:00.000Z"
}
```

### Evento: add_payment_info (COM ERRO)

```json
{
  "action": "add_payment_info",
  "cartId": "user123_prod123",
  "userId": "user123",
  "userPhone": "5511999999999",
  "userName": "João Silva",
  "productName": "Curso de Marketing",
  "productCategory": "curso",
  "cartValue": 497.00,
  "currency": "BRL",
  "status": "payment",
  "paymentMethod": "credit_card",
  "paymentGateway": "stripe",
  "installments": 3,
  "hasError": true,
  "error": {
    "code": "CARD_DECLINED",
    "message": "Cartão recusado pelo banco emissor",
    "type": "payment",
    "gateway": "stripe",
    "paymentMethod": "credit_card"
  },
  "errorCount": 1,
  "checkoutStep": "payment",
  "source": "google",
  "campaign": "curso-marketing-2024",
  "timeToPayment": 180,
  "timestamp": "2025-12-15T10:05:00.000Z"
}
```

### Evento: purchase

```json
{
  "action": "purchase",
  "cartId": "user123_prod123",
  "userId": "user123",
  "userPhone": "5511999999999",
  "userName": "João Silva",
  "productName": "Curso de Marketing",
  "productCategory": "curso",
  "cartValue": 497.00,
  "currency": "BRL",
  "status": "completed",
  "paymentMethod": "credit_card",
  "paymentGateway": "stripe",
  "installments": 3,
  "discountCode": "DESCONTO10",
  "discountValue": 49.70,
  "recovered": true,
  "hadErrors": false,
  "errorCount": 0,
  "timeToCheckout": 120,
  "timeToPayment": 180,
  "timeToPurchase": 60,
  "totalTime": 360,
  "source": "google",
  "campaign": "curso-marketing-2024",
  "timestamp": "2025-12-15T10:06:00.000Z"
}
```

---

## 📊 Métricas Disponíveis

Com esses novos parâmetros, você pode analisar:

1. **Taxa de Erro por Gateway**
   - Quantos erros por gateway (stripe, pagarme, etc)
   - Qual gateway tem mais problemas

2. **Taxa de Erro por Método de Pagamento**
   - Cartão de crédito vs PIX vs Boleto
   - Qual método tem mais falhas

3. **Tipos de Erro Mais Comuns**
   - CARD_DECLINED, INSUFFICIENT_FUNDS, etc
   - Identificar problemas específicos

4. **Tempo Médio Entre Etapas**
   - timeToCheckout: tempo do cart até checkout
   - timeToPayment: tempo do checkout até pagamento
   - timeToPurchase: tempo do pagamento até compra

5. **Origem dos Abandonos**
   - Qual fonte (google, facebook) tem mais abandonos
   - Qual campanha converte melhor

6. **Impacto dos Erros**
   - Quantos abandonos foram causados por erros
   - Valor perdido por erros de pagamento

---

## 🎯 Próximos Passos

1. **Atualizar Google Sheets** para incluir colunas de erro
2. **Criar dashboard** no Looker Studio com métricas de erro
3. **Configurar alertas** quando taxa de erro ultrapassar limite
4. **Personalizar mensagens** baseadas no tipo de erro

---

## 💡 Dicas de Implementação

### Na Voomp (ao enviar eventos)

```javascript
// Exemplo: quando detectar erro no add_payment_info
fetch('http://monitor:3000/webhook/event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: user.id,
    userPhone: user.phone,
    userName: user.name,
    eventType: 'add_payment_info',
    productName: product.name,
    cartValue: cart.value,
    paymentMethod: 'credit_card',
    paymentGateway: 'stripe',
    hasError: true,
    error: {
      code: paymentError.code,
      message: paymentError.message,
      type: 'payment',
      gateway: 'stripe',
      paymentMethod: 'credit_card'
    }
  })
});
```

### No n8n (ao receber eventos com erro)

Use o campo `hasError` e `error` para:
- Enviar mensagens personalizadas baseadas no erro
- Priorizar leads com erros de pagamento
- Oferecer alternativas (PIX se cartão falhou)

---

## ✅ Checklist de Implementação

- [ ] Atualizar eventos da Voomp para incluir campos de erro
- [ ] Testar envio de evento com erro
- [ ] Atualizar Google Sheets com colunas de erro
- [ ] Configurar n8n para tratar erros
- [ ] Criar dashboard com métricas de erro
- [ ] Configurar alertas de erro

