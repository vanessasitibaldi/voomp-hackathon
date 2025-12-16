# ⚡ Resumo Rápido

teste commit

## 🎯 O que faz?

1. Salva todos os eventos no Google Sheets
2. Envia WhatsApp quando carrinho fica abandonado

## 📋 Status

| Status        | Quando Envia Mensagem |
| ------------- | --------------------- |
| **COLD**      | 24h sem checkout      |
| **WARM**      | 3h sem pagamento      |
| **HOT**       | 1h sem compra         |
| **COMPLETED** | Remove da memória     |

## 🔄 Fluxo

```
cart → begin_checkout → add_payment_info → purchase
 ↓          ↓                ↓              ↓
cold       warm             hot         completed
```

## 📞 Endpoint

```bash
POST http://localhost:3000/webhook/event
{
  "userId": "user123",
  "userPhone": "5511999999999",
  "eventType": "cart | begin_checkout | add_payment_info | purchase",
  "productName": "Produto",
  "cartValue": 497.00
}
```

## 🔑 Regras

1. `begin_checkout` = UM evento (não por etapa)
2. Todos eventos vão para Google Sheets
3. Recuperação automática por status

---

**Pronto!** 🚀
