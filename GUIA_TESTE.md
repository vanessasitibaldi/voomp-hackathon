# 🧪 Guia Passo a Passo - Teste do Fluxo

## 📋 Passo a Passo Completo

### 1️⃣ Instalação e Preparação

```bash
# 1. Instalar todas as dependências
npm install
```

### 2️⃣ Subir o Backend (Servidor API)

**Terminal 1:**
```bash
# Rodar o servidor em modo desenvolvimento
npm run dev
```

**O que você deve ver:**
```
🚀 Servidor rodando na porta 3000
📡 Webhook n8n: http://localhost:5678/webhook
⏰ Verificando recuperação a cada 60 minutos
🚀 Monitor iniciado
```

**Teste rápido:**
```bash
# Em outro terminal, teste se está funcionando
curl http://localhost:3000/health
```

### 3️⃣ Subir o Frontend (Interface React)

**Terminal 2:**
```bash
# Rodar o frontend em modo desenvolvimento
npm run dev:frontend
```

**O que você deve ver:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 4️⃣ Testar o Fluxo Completo

#### Opção A: Testar via Interface Web (Checkout)

1. Acesse: **http://localhost:5173**
2. Você verá a página de checkout com o layout do Voomp.

**Fluxo de Teste:**

**Passo 1 - Dados Pessoais:**
- Preencha: Nome, E-mail, Telefone, CPF
- Clique em "Continuar"
- ✅ **Evento enviado:** `cart` → `begin_checkout`

**Passo 2 - Endereço:**
- Preencha: CEP, Endereço, Número, Cidade, Bairro, Estado
- Clique em "Continuar"
- ✅ **Evento enviado:** `add_payment_info`

**Passo 3 - Pagamento:**
- Preencha os dados do cartão
- ⚠️ **Opcional:** Marque "Simular erro de pagamento" para testar remarketing
- Clique em "Comprar agora"
- ✅ **Evento enviado:** `purchase` (com ou sem erro)

**O que observar:**
- Abra o **Console do navegador** (F12)
- Você verá mensagens: `✅ Evento cart enviado com sucesso`
- No **Terminal 1 (backend)**, verá: `📊 Evento processado: cart - Status: cold`

#### Opção B: Testar via Interface de Teste

1. Acesse: **http://localhost:5173/test**
2. Preencha os campos:
   - **Tipo de Evento:** escolha `cart`, `begin_checkout`, `add_payment_info` ou `purchase`
   - **User ID:** deixe ou altere
   - **Telefone:** ex: `5511999999999`
   - **Nome:** ex: `João Silva Teste`
   - **Produto:** ex: `Oferta PNE 3.0 | Julho/25`
   - **Valor:** ex: `1997.00`
   - **Simular Erro:** marque para testar cenário de erro
3. Clique em **"Enviar Evento"**
4. Veja a resposta JSON abaixo

**Botão "Ver Estatísticas":**
- Clique para ver quantos carrinhos estão em cada status
- Retorna: `{ totalCarts: X, cold: X, warm: X, hot: X, completed: X }`

### 5️⃣ Testar via API Diretamente (cURL/Postman)

```bash
# 1. Evento de Carrinho
curl -X POST http://localhost:3000/webhook/event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "userPhone": "5511999999999",
    "userName": "João Silva",
    "eventType": "cart",
    "productName": "Oferta PNE 3.0 | Julho/25",
    "cartValue": 1997.00
  }'

# 2. Evento de Checkout
curl -X POST http://localhost:3000/webhook/event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "userPhone": "5511999999999",
    "eventType": "begin_checkout",
    "cartValue": 1997.00
  }'

# 3. Evento de Pagamento
curl -X POST http://localhost:3000/webhook/event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "userPhone": "5511999999999",
    "eventType": "add_payment_info",
    "cartValue": 1997.00
  }'

# 4. Evento de Compra (sucesso)
curl -X POST http://localhost:3000/webhook/event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "userPhone": "5511999999999",
    "eventType": "purchase",
    "cartValue": 1997.00,
    "hasError": false
  }'

# 5. Ver Estatísticas
curl http://localhost:3000/stats

# 6. Health Check
curl http://localhost:3000/health
```

### 6️⃣ Fluxo Completo de Teste (Simulação Real)

**Cenário 1: Compra Bem-Sucedida**
```bash
# 1. Usuário adiciona ao carrinho
POST /webhook/event
{
  "userId": "user_test_1",
  "userPhone": "5511999999999",
  "eventType": "cart",
  "productName": "Oferta PNE 3.0",
  "cartValue": 1997.00
}
# Status: COLD

# 2. Usuário inicia checkout
POST /webhook/event (mesmo userId)
{
  "eventType": "begin_checkout"
}
# Status: WARM

# 3. Usuário preenche pagamento
POST /webhook/event (mesmo userId)
{
  "eventType": "add_payment_info"
}
# Status: HOT

# 4. Compra concluída
POST /webhook/event (mesmo userId)
{
  "eventType": "purchase",
  "hasError": false
}
# Status: COMPLETED (removido da memória)
```

**Cenário 2: Testar Remarketing (Carrinho Abandonado)**
```bash
# 1. Usuário adiciona ao carrinho
POST /webhook/event
{
  "userId": "user_test_2",
  "userPhone": "5511888888888",
  "eventType": "cart",
  "productName": "Oferta PNE 3.0",
  "cartValue": 1997.00
}
# Status: COLD

# 2. ESPERE 24 horas (ou ajuste o código para teste rápido)
# OU modifique temporariamente em EventMonitor.ts:
# private readonly COLD_TIMEOUT_HOURS = 0.01; // 36 segundos para teste

# 3. O sistema vai verificar automaticamente e enviar recovery
# Verifique no Terminal 1:
# 🔍 Encontrados X carrinhos expirados
# ✅ Enviado para n8n: recovery - cold
```

### 7️⃣ Verificar os Logs

**No Terminal 1 (Backend), você verá:**
```
📊 Evento processado: cart - Status: cold - User: user123
✅ Enviado para n8n: cart - cold
📊 Evento processado: begin_checkout - Status: warm - User: user123
✅ Enviado para n8n: begin_checkout - warm
```

**No Console do Navegador (F12):**
```
✅ Evento cart enviado com sucesso
✅ Evento begin_checkout enviado com sucesso
```

### 8️⃣ Integração com n8n (Opcional)

Se quiser testar o fluxo completo com n8n:

1. **Suba o docker-compose** (se tiver n8n configurado):
```bash
docker-compose up -d
```

2. **Acesse n8n:** http://localhost:5678

3. **Crie um workflow com:**
   - **Webhook node:** recebe em `/webhook`
   - Configure para receber os eventos
   - Adicione nodes para processar (WhatsApp, Google Sheets, etc.)

4. **O backend já está enviando para:** `http://localhost:5678/webhook`

### 9️⃣ Build para Produção

```bash
# Build completo (backend + frontend)
npm run build

# Ou separado:
npm run build:server  # Apenas backend
npm run build:frontend # Apenas frontend

# Rodar produção
npm start
```

## ✅ Checklist de Teste

- [ ] Backend rodando na porta 3000
- [ ] Frontend rodando na porta 5173
- [ ] Evento `cart` sendo enviado
- [ ] Evento `begin_checkout` sendo enviado
- [ ] Evento `add_payment_info` sendo enviado
- [ ] Evento `purchase` sendo enviado
- [ ] Estatísticas sendo retornadas em `/stats`
- [ ] Health check funcionando em `/health`

## 💡 Dicas para Teste Rápido

Para testar o remarketing mais rápido, você pode temporariamente modificar `src/monitor/EventMonitor.ts`:

```typescript
// Alterar temporariamente para testes (linhas 80-82)
private readonly COLD_TIMEOUT_HOURS = 0.01;  // 36 segundos
private readonly WARM_TIMEOUT_HOURS = 0.01;  // 36 segundos  
private readonly HOT_TIMEOUT_HOURS = 0.01;   // 36 segundos
```

E também reduzir o intervalo de verificação no `src/server.ts`:
```typescript
const checkInterval = parseInt(process.env.CHECK_INTERVAL || '60000'); // 1 minuto para teste
```

Com isso, você pode testar o remarketing em poucos segundos ao invés de horas!

## 📊 Fluxo de Eventos

```
cart → begin_checkout → add_payment_info → purchase
 ↓          ↓                ↓              ↓
COLD       WARM             HOT         COMPLETED
```

### Status e Timeouts para Recovery

| Status | Significa | Quando Envia Mensagem |
|--------|-----------|----------------------|
| **COLD** | Tem `cart` mas não `begin_checkout` | Após 24h |
| **WARM** | Tem `begin_checkout` mas não `add_payment_info` | Após 3h |
| **HOT** | Tem `add_payment_info` mas não `purchase` | Após 1h |
| **COMPLETED** | Tem `purchase` | Nunca (remove da memória) |

## 🔗 Endpoints Disponíveis

### POST /webhook/event
Recebe eventos da plataforma Voomp

**Campos obrigatórios:**
- `userId` (string)
- `userPhone` (string)
- `eventType` (string): `cart` | `begin_checkout` | `add_payment_info` | `purchase`

**Campos opcionais:**
- `userName`, `productName`, `productId`, `cartValue`, `currency`, `paymentMethod`, `hasError`, `error`, `source`, `campaign`, `metadata`, etc.

### GET /health
Status do sistema e estatísticas em tempo real

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "stats": {
    "totalCarts": 5,
    "cold": 2,
    "warm": 1,
    "hot": 1,
    "completed": 1
  }
}
```

### GET /stats
Estatísticas detalhadas dos carrinhos monitorados

**Resposta:**
```json
{
  "totalCarts": 5,
  "cold": 2,
  "warm": 1,
  "hot": 1,
  "completed": 0
}
```

## 🐛 Troubleshooting

### Backend não inicia
- Verifique se a porta 3000 está livre
- Verifique se há erros no terminal
- Tente: `lsof -ti:3000 | xargs kill` (Linux/Mac) para liberar a porta

### Frontend não inicia
- Verifique se a porta 5173 está livre
- Verifique se há erros no terminal
- Tente limpar cache: `rm -rf node_modules/.vite`

### Eventos não são enviados
- Verifique se o backend está rodando
- Verifique o console do navegador para erros
- Verifique a URL da API em `src/services/api.ts`

### n8n não recebe eventos
- Verifique se o n8n está rodando: `docker ps`
- Verifique a URL do webhook em `.env`: `N8N_WEBHOOK_URL`
- Verifique os logs do backend para mensagens de erro

---

**Pronto!** 🎉 Agora você tem tudo para testar o sistema completo!

