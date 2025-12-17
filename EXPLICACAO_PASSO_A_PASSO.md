# 📚 Sistema de Recuperação de Vendas

## 🎯 O que faz?

1. **Salva todos os eventos** no Google Sheets (via n8n)
2. **Envia WhatsApp** quando carrinho fica abandonado

---

## 📋 Fluxo do Checkout

```
cart → begin_checkout → add_payment_info → purchase
 ↓          ↓                ↓              ↓
cold       warm             hot         completed
```

### Status

| Status | Significa | Quando Envia Mensagem |
|--------|-----------|----------------------|
| **COLD** | Tem `cart` mas não `begin_checkout` | Após 24h |
| **WARM** | Tem `begin_checkout` mas não `add_payment_info` | Após 3h |
| **HOT** | Tem `add_payment_info` mas não `purchase` | Após 1h |
| **COMPLETED** | Tem `purchase` | Nunca (remove da memória) |

---

## 🔄 Como Funciona

### 1. Usuário adiciona produto
```json
POST /webhook/event
{
  "userId": "user123",
  "userPhone": "5511999999999",
  "eventType": "cart",
  "productName": "Curso de Marketing",
  "cartValue": 497.00
}
```
→ Monitor salva no Google Sheets (via n8n)  
→ Status: `cold`

### 2. Usuário entra no checkout
```json
POST /webhook/event
{
  "userId": "user123",
  "userPhone": "5511999999999",
  "eventType": "begin_checkout",
  "cartValue": 497.00
}
```
→ Monitor salva no Google Sheets  
→ Status: `warm`  
⚠️ **Enviar UMA VEZ** (não por etapa)

### 3. Usuário preenche pagamento
```json
POST /webhook/event
{
  "userId": "user123",
  "userPhone": "5511999999999",
  "eventType": "add_payment_info",
  "hasError": false  // ou true se der erro
}
```
→ Monitor salva no Google Sheets  
→ Status: `hot`

### 4. Usuário compra
```json
POST /webhook/event
{
  "userId": "user123",
  "userPhone": "5511999999999",
  "eventType": "purchase",
  "hasError": false  // ou true se der erro
}
```
→ Monitor salva no Google Sheets  
→ Status: `completed`  
→ Remove da memória ✅

---

## 📱 Recuperação Automática

O monitor verifica a cada 1 hora e envia mensagem quando:

- **COLD** (cart) → 24h sem `begin_checkout`
- **WARM** (begin_checkout) → 3h sem `add_payment_info`
- **HOT** (add_payment_info) → 1h sem `purchase`

### O que é enviado para n8n:

```json
{
  "action": "recovery",
  "status": "cold",  // ou "warm" ou "hot"
  "userId": "user123",
  "userPhone": "5511999999999",
  "productName": "Curso de Marketing",
  "cartValue": 497.00,
  "hoursSinceLastEvent": 24
}
```

→ n8n envia WhatsApp automaticamente  
→ n8n salva no Google Sheets

---

## 💾 Persistência do userId com localStorage

### Como Funciona?

O sistema usa `localStorage` para manter o `userId` do usuário mesmo quando ele fecha o navegador. Isso permite rastrear corretamente quando um usuário retorna após receber uma mensagem de remarketing.

### Fluxo de Persistência

**1. Primeira visita:**
```javascript
// Verifica localStorage
localStorage.getItem('voomp_userId') → null

// Cria novo userId
const userId = generateUserId(); // "abc123-def456"
localStorage.setItem('voomp_userId', userId);
```

**2. Usuário fecha o navegador:**
```javascript
// localStorage mantém o userId ✅
localStorage.getItem('voomp_userId') → "abc123-def456"
```

**3. Usuário retorna (após remarketing):**
```javascript
// Recupera o mesmo userId ✅
const userId = getUserId(); // "abc123-def456"
// Sistema reconhece que é o mesmo usuário!
```

**4. Compra concluída:**
```javascript
// Limpa o localStorage após compra bem-sucedida
clearUserId();
localStorage.getItem('voomp_userId') → null
```

### Benefícios

✅ **Rastreamento correto**: Mesmo userId entre sessões  
✅ **Privacidade**: Apenas o identificador é salvo (sem dados sensíveis)  
✅ **Limpeza automática**: Remove após compra concluída  
✅ **Fallback seguro**: Se localStorage não disponível, gera ID temporário  

### O Que É Armazenado?

```javascript
// ✅ APENAS o userId (hash único)
localStorage: {
  "voomp_userId": "abc123-def456-ghi789"
}

// ❌ NUNCA armazena dados sensíveis:
// - CPF
// - Cartão de crédito
// - CVV
// - Endereço completo
```

---

## 🔄 Como Rastrear Recuperações

### Como Saber se o Usuário Retornou do Remarketing?

Quando um usuário recebe mensagem de recuperação (`recovery`) e depois completa a compra (`purchase`), o sistema marca automaticamente como recuperado.

### Campos Adicionados no Evento Purchase

Quando `action = "purchase"`, os seguintes campos são incluídos:

- `recovered` → `true` se houve recovery antes, `false` se não
- `recoveryValue` → Valor da compra recuperada (mesmo que `cartValue` se recuperado)
- `recoveryStatus` → Status do recovery (cold, warm ou hot)

### Exemplo no Google Sheets

| timestamp | action | status | cartId | recovered | recoveryValue | cartValue | userPhone |
|-----------|--------|--------|--------|-----------|---------------|-----------|-----------|
| 2025-12-15 10:00 | cart | cold | user123_prod1 | false | 0 | 497.00 | 5511999999999 |
| 2025-12-16 10:00 | recovery | cold | user123_prod1 | false | 0 | 497.00 | 5511999999999 |
| 2025-12-16 12:00 | purchase | completed | user123_prod1 | **true** | **497.00** | 497.00 | 5511999999999 |

### Como Identificar no Looker Studio

#### Métricas de Recuperação

1. **Total de Compras Recuperadas:**
   ```
   COUNT(CASE WHEN action = 'purchase' AND recovered = true THEN 1 END)
   ```

2. **Valor Total Recuperado:**
   ```
   SUM(CASE WHEN action = 'purchase' AND recovered = true THEN cartValue ELSE 0 END)
   ```

3. **Taxa de Recuperação:**
   ```
   COUNT(CASE WHEN action = 'purchase' AND recovered = true THEN 1 END) / 
   COUNT(CASE WHEN action = 'recovery' THEN 1 END)
   ```

4. **Valor Médio Recuperado:**
   ```
   AVG(CASE WHEN action = 'purchase' AND recovered = true THEN cartValue END)
   ```

#### Visualizações

**Gráfico: Recuperações por Status**
- **Tipo:** Barras
- **Dimensão:** `recoveryStatus` (cold, warm, hot)
- **Métrica:** Contagem de compras recuperadas

**Tabela: Compras Recuperadas**
- **Filtro:** `action = 'purchase' AND recovered = true`
- **Colunas:** `timestamp`, `userPhone`, `productName`, `cartValue`, `recoveryStatus`
- **Ordenação:** `cartValue` (decrescente)

**KPI: Valor Recuperado vs Valor Abandonado**
- **Valor Recuperado:** `SUM(recoveryValue WHERE recovered = true)`
- **Valor Abandonado:** `SUM(cartValue WHERE status IN ('cold', 'warm', 'hot'))`

---

## 📊 Google Sheets

### Estrutura Simples

| timestamp | action | status | userId | userPhone | productName | cartValue | hasError | recovered | recoveryValue |
|-----------|--------|--------|--------|-----------|-------------|-----------|----------|-----------|---------------|
| 2025-12-15 10:00 | cart | cold | user123 | 5511999999999 | Curso | 497.00 | false | false | 0 |
| 2025-12-15 10:02 | begin_checkout | warm | user123 | 5511999999999 | Curso | 497.00 | false | false | 0 |
| 2025-12-15 10:05 | add_payment_info | hot | user123 | 5511999999999 | Curso | 497.00 | false | false | 0 |
| 2025-12-15 11:05 | recovery | hot | user123 | 5511999999999 | Curso | 497.00 | false | false | 0 |
| 2025-12-15 12:00 | purchase | completed | user123 | 5511999999999 | Curso | 497.00 | false | **true** | **497.00** |

### Filtrar por Status

- `status = "cold"` → Carrinhos abandonados (24h)
- `status = "warm"` → Checkout abandonado (3h)
- `status = "hot"` → Pagamento abandonado (1h)
- `action = "recovery"` → Mensagens enviadas

---

## 🔑 Regras Importantes

1. ✅ `begin_checkout` = **UM evento** (não por etapa)
2. ✅ Todos eventos vão para Google Sheets
3. ✅ Recuperação automática baseada no status
4. ✅ `purchase` com sucesso = remove da memória

---

## 📞 Endpoints

### Enviar Evento
```
POST http://localhost:3000/webhook/event
Content-Type: application/json

{
  "userId": "string (obrigatório)",
  "userPhone": "string (obrigatório)",
  "eventType": "cart | begin_checkout | add_payment_info | purchase",
  "productName": "string",
  "cartValue": 497.00,
  "hasError": false,
  "error": { ... }  // se hasError = true
}
```

### Ver Estatísticas
```
GET http://localhost:3000/stats
```

### Health Check
```
GET http://localhost:3000/health
```

---

## 📊 Dashboard Looker Studio

### Dados Disponíveis

Todos os eventos salvos no Google Sheets podem ser conectados ao Looker Studio para criar dashboards de controle interno.

**Campos disponíveis:**
- `timestamp` → Data/hora do evento
- `action` → cart, begin_checkout, add_payment_info, purchase, recovery
- `status` → cold, warm, hot, completed
- `cartId` → ID único do carrinho
- `userId` → ID do usuário
- `userPhone` → Telefone
- `productName` → Nome do produto
- `cartValue` → Valor do carrinho
- `hasError` → Se teve erro (true/false)
- `error` → Detalhes do erro
- `source` → Origem do tráfego
- `campaign` → Campanha de marketing
- `hoursSinceLastEvent` → Horas desde último evento (recovery)

---

### Métricas Principais (KPIs)

#### Funil de Conversão
```
Total Carrinhos (cart)
  ↓ Taxa de Conversão
Total Checkouts (begin_checkout)
  ↓ Taxa de Conversão
Total Pagamentos (add_payment_info)
  ↓ Taxa de Conversão
Total Compras (purchase)
```

**Fórmulas no Looker Studio:**

1. **Taxa Cart → Checkout:**
   ```
   COUNT(CASE WHEN action = 'begin_checkout' THEN 1 END) / 
   COUNT(CASE WHEN action = 'cart' THEN 1 END)
   ```

2. **Taxa Checkout → Pagamento:**
   ```
   COUNT(CASE WHEN action = 'add_payment_info' THEN 1 END) / 
   COUNT(CASE WHEN action = 'begin_checkout' THEN 1 END)
   ```

3. **Taxa Pagamento → Compra:**
   ```
   COUNT(CASE WHEN action = 'purchase' AND hasError = false THEN 1 END) / 
   COUNT(CASE WHEN action = 'add_payment_info' THEN 1 END)
   ```

#### Valor Total

1. **Receita Total:**
   ```
   SUM(CASE WHEN action = 'purchase' AND hasError = false THEN cartValue ELSE 0 END)
   ```

2. **Valor Abandonado:**
   ```
   SUM(CASE WHEN status IN ('cold', 'warm', 'hot') THEN cartValue ELSE 0 END)
   ```

3. **Valor Recuperado:**
   ```
   SUM(CASE WHEN action = 'purchase' 
            AND status = 'completed' 
            AND cartId IN (SELECT cartId WHERE action = 'recovery') 
            THEN cartValue ELSE 0 END)
   ```

#### Taxa de Recuperação

1. **Mensagens Enviadas:**
   ```
   COUNT(CASE WHEN action = 'recovery' THEN 1 END)
   ```

2. **Taxa de Recuperação:**
   ```
   COUNT(CASE WHEN action = 'purchase' 
            AND cartId IN (SELECT cartId WHERE action = 'recovery') 
            THEN 1 END) / 
   COUNT(CASE WHEN action = 'recovery' THEN 1 END)
   ```

---

### Visualizações Sugeridas

#### 1. Funil de Conversão
- **Tipo:** Funil
- **Dimensão:** `action` (cart, begin_checkout, add_payment_info, purchase)
- **Métrica:** Contagem de eventos
- **Filtro:** `hasError = false` (para purchase)

#### 2. Status dos Carrinhos
- **Tipo:** Pizza ou Barras
- **Dimensão:** `status` (cold, warm, hot, completed)
- **Métrica:** Contagem de carrinhos únicos (`cartId`)

#### 3. Receita ao Longo do Tempo
- **Tipo:** Linha
- **Dimensão:** `timestamp` (agrupado por dia/semana)
- **Métrica:** `SUM(cartValue)` onde `action = 'purchase' AND hasError = false`

#### 4. Taxa de Abandono por Status
- **Tipo:** Barras
- **Dimensão:** `status`
- **Métrica:** `COUNT(DISTINCT cartId)` onde `status IN ('cold', 'warm', 'hot')`

#### 5. Erros de Pagamento
- **Tipo:** Tabela
- **Dimensões:** `error_code`, `error_message`, `timestamp`
- **Métrica:** Contagem
- **Filtro:** `hasError = true`

#### 6. Performance por Origem
- **Tipo:** Tabela
- **Dimensões:** `source`, `campaign`
- **Métricas:** Total de carrinhos, Taxa de conversão, Receita total

#### 7. Eficácia da Recuperação
- **Tipo:** Barras
- **Dimensão:** `status` (cold, warm, hot)
- **Métricas:** Mensagens enviadas, Taxa de recuperação

---

### Tabelas Detalhadas

#### Tabela 1: Carrinhos Abandonados
- **Filtro:** `status IN ('cold', 'warm', 'hot')`
- **Colunas:** `timestamp`, `status`, `userPhone`, `productName`, `cartValue`, `hoursSinceLastEvent`
- **Ordenação:** `cartValue` (decrescente)

#### Tabela 2: Erros de Pagamento
- **Filtro:** `hasError = true`
- **Colunas:** `timestamp`, `userPhone`, `productName`, `cartValue`, `error_code`, `error_message`
- **Agrupamento:** `error_code`

#### Tabela 3: Recuperações Bem-Sucedidas
- **Filtro:** `action = 'purchase'` E `cartId` existe em `action = 'recovery'`
- **Colunas:** `timestamp`, `userPhone`, `productName`, `cartValue`, `status` (do recovery)

---

### Filtros Úteis

- **Período:** `timestamp` (últimos 7/30/90 dias)
- **Status:** `status` (cold, warm, hot, completed)
- **Ação:** `action` (cart, begin_checkout, add_payment_info, purchase, recovery)
- **Erros:** `hasError = true`
- **Origem:** `source` (google, facebook, direct, etc.)
- **Campanha:** `campaign`

---

### Exemplo de Dashboard Completo

#### Painel 1: Visão Geral
- **KPIs:** Total de carrinhos, Taxa de conversão geral, Receita total, Valor abandonado
- **Gráfico:** Funil de conversão

#### Painel 2: Abandono e Recuperação
- **KPIs:** Mensagens enviadas, Taxa de recuperação, Valor recuperado
- **Gráfico:** Status dos carrinhos
- **Gráfico:** Eficácia da recuperação por status

#### Painel 3: Análise de Erros
- **KPIs:** Total de erros, Taxa de erro
- **Gráfico:** Erros por tipo (`error_code`)
- **Tabela:** Detalhes dos erros

#### Painel 4: Performance por Origem
- **Tabela:** Performance por `source` e `campaign`
- **Gráfico:** Receita por origem

---

### Dicas para Looker Studio

1. **Criar dimensão calculada "Dia da Semana":**
   ```
   DAY_OF_WEEK(timestamp)
   ```

2. **Criar métrica "Taxa de Conversão Geral":**
   ```
   COUNT(CASE WHEN action = 'purchase' AND hasError = false THEN 1 END) / 
   COUNT(CASE WHEN action = 'cart' THEN 1 END)
   ```

3. **Criar métrica "Valor Médio do Carrinho":**
   ```
   AVG(cartValue)
   ```

4. **Criar dimensão "Tempo até Compra"** (para carrinhos completados):
   ```
   DATEDIFF(timestamp WHERE action = 'purchase', timestamp WHERE action = 'cart')
   ```

---

## ❓ Perguntas Frequentes

**Q: Todos os eventos vão para o Google Sheets?**  
R: Sim! Todos são enviados para n8n que salva no Google Sheets.

**Q: Quando envia WhatsApp?**  
R: Automaticamente quando:
- COLD após 24h
- WARM após 3h
- HOT após 1h

**Q: O que acontece se `purchase` tiver erro?**  
R: O evento é salvo no Google Sheets, mas o carrinho continua sendo monitorado.

---

**Fim** 🎉
