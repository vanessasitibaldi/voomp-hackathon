# 📁 Arquitetura do Projeto - Descrição dos Arquivos

Este documento explica a função de cada arquivo e diretório do projeto Voomp.

---

## 📂 Estrutura de Diretórios

```
voomp-hackathon/
├── src/                    # Código fonte principal
│   ├── components/         # Componentes React
│   ├── monitor/           # Lógica de monitoramento
│   ├── services/          # Serviços e APIs
│   └── server.ts          # Servidor Express (Backend)
├── docker-compose.yml      # Configuração Docker
├── package.json           # Dependências e scripts
└── *.config.*             # Arquivos de configuração
```

---

## 🔧 Arquivos de Configuração

### `package.json`
**O que faz:** Gerencia as dependências do projeto e define os scripts de execução.

**Principais scripts:**
- `dev` - Roda o backend em modo desenvolvimento
- `dev:frontend` - Roda o frontend (Vite)
- `build` - Compila backend + frontend para produção
- `start` - Roda o servidor compilado

**Dependências principais:**
- Backend: `express`, `cors`, `axios`
- Frontend: `react`, `react-dom`, `react-router-dom`
- Dev: `typescript`, `vite`, `ts-node-dev`

---

### `tsconfig.json`
**O que faz:** Configuração TypeScript principal (usado pelo frontend React).

**Configurações:**
- Target: ES2020
- Module: ESNext (para Vite/React)
- JSX: react-jsx
- Module Resolution: bundler (Vite)

---

### `tsconfig.server.json`
**O que faz:** Configuração TypeScript específica para o servidor Node.js.

**Diferenças do tsconfig.json:**
- Module: commonjs (Node.js)
- Module Resolution: node
- Não inclui arquivos React (.tsx)

**Uso:** Compilação do backend com `tsc -p tsconfig.server.json`

---

### `tsconfig.node.json`
**O que faz:** Configuração TypeScript para arquivos Node.js do Vite (ex: vite.config.ts).

---

### `vite.config.ts`
**O que faz:** Configuração do Vite (build tool do frontend React).

**Configurações:**
- Plugins: React
- Porta dev: 5173
- Proxy: `/api` → `http://localhost:3000` (para API backend)
- Build: output em `dist/public`

---

### `docker-compose.yml`
**O que faz:** Orquestra os serviços Docker (n8n, Evolution API, PostgreSQL, Redis).

**Serviços incluídos:**
- `n8n` - Automação de workflows
- `evolution` - API WhatsApp
- `postgres` - Banco de dados para n8n
- `evolution-db` - Banco de dados para Evolution API
- `evolution-redis` - Cache Redis

---

### `Dockerfile.monitor`
**O que faz:** Dockerfile para construir a imagem do monitor (usado em produção).

---

## 🖥️ Backend (Servidor Node.js)

### `src/server.ts`
**O que faz:** Servidor Express que recebe eventos e gerencia o monitoramento.

**Principais funcionalidades:**
1. **Inicializa o EventMonitor** - Cria e inicia o monitor
2. **Middleware** - CORS e JSON parser
3. **Endpoints:**
   - `GET /health` - Status do sistema e estatísticas
   - `GET /stats` - Estatísticas dos carrinhos
   - `POST /webhook/event` - Recebe eventos do frontend

**Fluxo:**
```
Frontend → POST /webhook/event → server.ts → EventMonitor.processEvent()
```

**Variáveis de ambiente:**
- `PORT` - Porta do servidor (padrão: 3000)
- `N8N_WEBHOOK_URL` - URL do webhook n8n
- `CHECK_INTERVAL` - Intervalo de verificação (ms)

---

### `src/monitor/EventMonitor.ts`
**O que faz:** Classe principal que monitora eventos de compra e gerencia o remarketing.

**Responsabilidades:**

1. **Gerencia Carrinhos** - Armazena dados dos carrinhos em memória (Map)
2. **Rastreia Status** - Acompanha o status de cada carrinho (COLD, WARM, HOT, COMPLETED)
3. **Detecta Abandonos** - Verifica periodicamente carrinhos abandonados
4. **Envia para n8n** - Dispara webhooks para n8n com dados dos eventos

**Status dos Carrinhos:**
- `COLD` - Carrinho criado, sem checkout (24h timeout)
- `WARM` - Checkout iniciado (3h timeout)
- `HOT` - Pagamento preenchido (1h timeout)
- `COMPLETED` - Compra finalizada (remove da memória)

**Métodos principais:**
- `processEvent()` - Processa um evento recebido
- `checkRecovery()` - Verifica carrinhos que precisam de recovery
- `sendRecovery()` - Envia mensagem de recuperação
- `sendToN8N()` - Envia dados para webhook n8n
- `getStats()` - Retorna estatísticas

**Timeouts (configuráveis):**
```typescript
COLD_TIMEOUT_HOURS = 24  // cart → 24h sem checkout
WARM_TIMEOUT_HOURS = 3   // begin_checkout → 3h sem pagamento
HOT_TIMEOUT_HOURS = 1    // add_payment_info → 1h sem compra
```

---

## 🎨 Frontend (React)

### `src/index.html`
**O que faz:** Arquivo HTML base da aplicação React.

**Conteúdo:**
- Estrutura HTML básica
- `<div id="root">` - Onde React renderiza
- Script para `main.tsx`

---

### `src/main.tsx`
**O que faz:** Ponto de entrada do React. Renderiza o componente `App`.

**Função:**
```typescript
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

---

### `src/index.css`
**O que faz:** Estilos CSS globais da aplicação.

**Inclui:**
- Reset CSS básico
- Estilos do checkout
- Estilos do testador de eventos
- Media queries para responsividade

---

### `src/App.tsx`
**O que faz:** Componente principal que configura as rotas da aplicação.

**Rotas:**
- `/` → `CheckoutForm` (página de checkout)
- `/checkout` → `CheckoutForm`
- `/test` → `EventTester` (interface de teste)

**Tecnologia:** React Router DOM

---

### `src/services/api.ts`
**O que faz:** Serviço para comunicação com a API backend.

**Funções:**
- `sendEvent()` - Envia evento para `/webhook/event`
- `getStats()` - Busca estatísticas em `/stats`
- `getHealth()` - Verifica saúde da API em `/health`

**URL base:** `http://localhost:3000` (ou `VITE_API_URL`)

---

## 🛒 Componentes do Checkout

### `src/components/Checkout/CheckoutForm.tsx`
**O que faz:** Componente principal do formulário de checkout. Orquestra os 3 passos.

**Responsabilidades:**
1. Gerencia o estado do formulário (dados do usuário)
2. Controla qual passo está sendo exibido (1, 2 ou 3)
3. Envia eventos para o backend em cada etapa:
   - `cart` - Quando página carrega
   - `begin_checkout` - Quando preenche dados pessoais
   - `add_payment_info` - Quando preenche endereço
   - `purchase` - Quando finaliza compra

**Passos:**
1. **Dados Pessoais** - Nome, Email, Telefone, CPF
2. **Endereço** - CEP, Endereço, Cidade, Estado
3. **Pagamento** - Cartão ou Boleto

---

### `src/components/Checkout/PersonalData.tsx`
**O que faz:** Formulário do passo 1 - coleta dados pessoais do usuário.

**Campos:**
- Nome Completo
- E-mail
- Telefone
- CPF ou CNPJ

**Validação:** Todos os campos são obrigatórios antes de avançar.

---

### `src/components/Checkout/Address.tsx`
**O que faz:** Formulário do passo 2 - coleta endereço de entrega.

**Campos:**
- CEP
- Endereço
- Número
- Complemento
- Cidade
- Bairro
- Estado

**Funcionalidade:** Permite voltar para o passo 1.

---

### `src/components/Checkout/Payment.tsx`
**O que faz:** Formulário do passo 3 - coleta informações de pagamento.

**Opções:**
- Cartão de Crédito
- Boleto

**Campos (cartão):**
- Número do cartão
- Nome do titular
- Validade (Mês/Ano)
- CVV
- Parcelas

**Funcionalidades:**
- Opção de simular erro de pagamento (para testar remarketing)
- Permite voltar para o passo 2
- Finaliza compra

---

### `src/components/Checkout/OrderSummary.tsx`
**O que faz:** Componente lateral que exibe o resumo do pedido.

**Informações exibidas:**
- Nome do produto
- Valor total
- Cupom aplicado (se houver)
- Informações do autor/produto
- Badges de segurança

**Posição:** Fixo no lado direito (sticky)

---

## 🧪 Componente de Teste

### `src/components/EventTester/EventTester.tsx`
**O que faz:** Interface para testar envio de eventos manualmente.

**Funcionalidades:**
1. **Formulário** - Permite preencher dados do evento
2. **Seleção de tipo** - Escolhe tipo de evento (cart, begin_checkout, etc.)
3. **Envio** - Botão para enviar evento
4. **Estatísticas** - Botão para ver estatísticas do sistema
5. **Resposta** - Exibe resposta JSON do servidor

**Uso:** Acesse `/test` para testar eventos sem usar o checkout completo.

---

## 📚 Documentação

### `README.md`
**O que faz:** Documentação principal do projeto.

**Conteúdo:**
- Descrição do projeto
- Instalação
- Configuração
- Como usar

---

### `GUIA_TESTE.md`
**O que faz:** Guia passo a passo para testar o sistema.

**Conteúdo:**
- Como subir backend e frontend
- Como testar cada funcionalidade
- Exemplos de requisições
- Troubleshooting

---

### `EXPLICACAO_PASSO_A_PASSO.md`
**O que faz:** Explicação detalhada do fluxo do sistema.

**Conteúdo:**
- Fluxo de eventos
- Status dos carrinhos
- Integração com n8n
- Configuração do Google Sheets

---

### `RESUMO_RAPIDO.md`
**O que faz:** Resumo executivo rápido do sistema.

**Conteúdo:**
- O que faz
- Status dos carrinhos
- Endpoints principais

---

### `PARAMETROS_EVENTOS.md`
**O que faz:** Documentação completa dos parâmetros dos eventos.

**Conteúdo:**
- Estrutura dos eventos
- Campos obrigatórios e opcionais
- Exemplos de payloads

---

## 🔄 Fluxo de Dados Completo

```
1. Usuário acessa checkout
   ↓
2. Frontend (CheckoutForm.tsx) envia evento 'cart'
   ↓
3. api.ts → POST http://localhost:3000/webhook/event
   ↓
4. server.ts recebe e valida
   ↓
5. EventMonitor.processEvent() processa
   ↓
6. EventMonitor.sendToN8N() → POST http://localhost:5678/webhook
   ↓
7. n8n recebe e processa (WhatsApp, Google Sheets, etc.)

(Repete para cada etapa: begin_checkout, add_payment_info, purchase)
```

---

## 📊 Fluxo de Eventos

### Evento: `cart`
**Quando:** Usuário acessa a página de checkout

**Status:** COLD

**Enviado para n8n:** ✅ Sim

---

### Evento: `begin_checkout`
**Quando:** Usuário preenche dados pessoais e clica "Continuar"

**Status:** WARM

**Enviado para n8n:** ✅ Sim

---

### Evento: `add_payment_info`
**Quando:** Usuário preenche endereço e clica "Continuar"

**Status:** HOT

**Enviado para n8n:** ✅ Sim

---

### Evento: `purchase`
**Quando:** Usuário finaliza a compra

**Status:** COMPLETED

**Ação:** Remove carrinho da memória

**Enviado para n8n:** ✅ Sim

---

### Evento: `recovery` (automático)
**Quando:** Carrinho abandonado atinge timeout:
- COLD: 24h sem checkout
- WARM: 3h sem pagamento
- HOT: 1h sem compra

**Enviado para n8n:** ✅ Sim (dispara mensagem de recuperação)

---

## 🔑 Pontos Importantes

### Armazenamento de Dados
- **Memória:** Carrinhos são armazenados em `Map` na memória (não persiste após restart)
- **n8n:** Todos os eventos são enviados para n8n que pode salvar no Google Sheets
- **localStorage:** (Futuro) Pode ser implementado para persistir dados no frontend

### Recuperação de Carrinhos
- Verificação periódica configurável (padrão: 1 hora)
- Timeouts configuráveis por status
- Cada carrinho recebe apenas 1 mensagem de recovery

### Integração com n8n
- Todos os eventos são enviados para o webhook configurado
- n8n pode processar e enviar WhatsApp via Evolution API
- n8n pode salvar no Google Sheets para métricas

---

## 🛠️ Como Estender

### Adicionar novo campo no checkout
1. Atualizar interface `CheckoutFormData` em `CheckoutForm.tsx`
2. Adicionar campo no componente correspondente (PersonalData, Address, Payment)
3. Atualizar `EventPayload` em `api.ts` se necessário
4. Atualizar `PurchaseEvent` em `EventMonitor.ts` se necessário

### Adicionar novo tipo de evento
1. Atualizar tipo `eventType` em `api.ts` e `EventMonitor.ts`
2. Adicionar handler em `EventMonitor.processEvent()`
3. Atualizar `statusMap` em `server.ts`

### Modificar timeouts de recovery
1. Editar constantes em `EventMonitor.ts`:
   ```typescript
   private readonly COLD_TIMEOUT_HOURS = 24;
   private readonly WARM_TIMEOUT_HOURS = 3;
   private readonly HOT_TIMEOUT_HOURS = 1;
   ```

---

**Última atualização:** Janeiro 2025

