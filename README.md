
Criando a estrutura do sistema de recuperação de vendas. Propondo os arquivos necessários:

## 1. Docker Compose com n8n, Evolution API e configurações

```yaml:docker-compose.yml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: voomp-n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin123
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
      - GENERIC_TIMEZONE=America/Sao_Paulo
      - TZ=America/Sao_Paulo
    volumes:
      - n8n_data:/home/node/.n8n
      - ./n8n/workflows:/data/workflows
    networks:
      - voomp-network

  evolution-api:
    image: evoapicloud/evolution-api:latest
    container_name: voomp-evolution-api
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=http://localhost:8080
      - AUTHENTICATION_API_KEY=voomp_evolution_key_2024
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://evolution:evolution123@evolution-db:5432/evolution
      - REDIS_ENABLED=true
      - REDIS_URI=redis://evolution-redis:6379
      - CONFIG_SESSION_PHONE_CLIENT=Evolution API
      - CONFIG_SESSION_PHONE_NAME=Chrome
      - QRCODE_LIMIT=30
      - QRCODE_COLOR=#198754
      - AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store
    depends_on:
      - evolution-db
      - evolution-redis
    networks:
      - voomp-network

  evolution-db:
    image: postgres:15-alpine
    container_name: voomp-evolution-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=evolution
      - POSTGRES_PASSWORD=evolution123
      - POSTGRES_DB=evolution
    volumes:
      - evolution_db_data:/var/lib/postgresql/data
    networks:
      - voomp-network

  evolution-redis:
    image: redis:7-alpine
    container_name: voomp-evolution-redis
    restart: unless-stopped
    volumes:
      - evolution_redis_data:/data
    networks:
      - voomp-network

  voomp-monitor:
    build:
      context: .
      dockerfile: Dockerfile.monitor
    container_name: voomp-monitor
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - N8N_WEBHOOK_URL=http://n8n:5678/webhook
      - EVOLUTION_API_URL=http://evolution-api:8080
      - EVOLUTION_API_KEY=voomp_evolution_key_2024
      - DATABASE_URL=${DATABASE_URL}
      - CHECK_INTERVAL=1800000
      - CART_EXPIRY_HOURS=6
    volumes:
      - ./src:/app/src
      - ./logs:/app/logs
    depends_on:
      - n8n
      - evolution-api
    networks:
      - voomp-network

volumes:
  n8n_data:
  evolution_instances:
  evolution_store:
  evolution_db_data:
  evolution_redis_data:

networks:
  voomp-network:
    driver: bridge
```

## 2. Script TypeScript para monitoramento de eventos

```typescript:src/monitor/EventMonitor.ts
import axios from 'axios';
import { EventEmitter } from 'events';

export enum PurchaseStatus {
  FRIO = 'frio',           // Carrinho
  MORNO = 'morno',         // begin_checkout
  QUENTE = 'quente',       // add_payment_info
  CONCLUIDO = 'concluido'  // Purchase
}

export interface PurchaseEvent {
  userId: string;
  userPhone: string;
  userName?: string;
  eventType: 'cart' | 'begin_checkout' | 'add_payment_info' | 'purchase';
  status: PurchaseStatus;
  productId?: string;
  productName?: string;
  cartValue?: number;
  timestamp: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface CartData {
  id: string;
  userId: string;
  userPhone: string;
  userName?: string;
  status: PurchaseStatus;
  createdAt: Date;
  lastEventAt: Date;
  productId?: string;
  productName?: string;
  cartValue?: number;
  events: PurchaseEvent[];
}

export class EventMonitor extends EventEmitter {
  private n8nWebhookUrl: string;
  private checkInterval: number;
  private cartExpiryHours: number;
  private carts: Map<string, CartData> = new Map();
  private intervalId?: NodeJS.Timeout;

  constructor(
    n8nWebhookUrl: string,
    checkInterval: number = 1800000, // 30 minutos
    cartExpiryHours: number = 6
  ) {
    super();
    this.n8nWebhookUrl = n8nWebhookUrl;
    this.checkInterval = checkInterval;
    this.cartExpiryHours = cartExpiryHours;
  }

  /**
   * Inicia o monitoramento de eventos
   */
  start(): void {
    console.log('🚀 Iniciando monitor de eventos...');
    this.intervalId = setInterval(() => {
      this.checkExpiredCarts();
    }, this.checkInterval);
    console.log(`✅ Monitor iniciado. Verificando carrinhos a cada ${this.checkInterval / 60000} minutos`);
  }

  /**
   * Para o monitoramento
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log('⏹️ Monitor parado');
  }

  /**
   * Processa um evento de compra
   */
  async processEvent(event: PurchaseEvent): Promise<void> {
    try {
      const cartId = this.getCartId(event.userId, event.productId);
      let cart = this.carts.get(cartId);

      if (!cart) {
        cart = {
          id: cartId,
          userId: event.userId,
          userPhone: event.userPhone,
          userName: event.userName,
          status: PurchaseStatus.FRIO,
          createdAt: event.createdAt,
          lastEventAt: event.timestamp,
          productId: event.productId,
          productName: event.productName,
          cartValue: event.cartValue,
          events: []
        };
        this.carts.set(cartId, cart);
      }

      // Atualiza status do carrinho
      cart.status = event.status;
      cart.lastEventAt = event.timestamp;
      cart.events.push(event);

      // Emite evento para processamento
      this.emit('purchaseEvent', cart, event);

      // Processa eventos específicos
      switch (event.eventType) {
        case 'purchase':
          await this.handlePurchase(cart, event);
          break;
        case 'begin_checkout':
          await this.handleBeginCheckout(cart, event);
          break;
        case 'add_payment_info':
          await this.handleAddPaymentInfo(cart, event);
          break;
      }

      console.log(`📊 Evento processado: ${event.eventType} - Status: ${event.status} - User: ${event.userId}`);
    } catch (error) {
      console.error('❌ Erro ao processar evento:', error);
      throw error;
    }
  }

  /**
   * Verifica carrinhos expirados e dispara ações
   */
  private async checkExpiredCarts(): Promise<void> {
    const now = new Date();
    const expiredCarts: CartData[] = [];

    for (const cart of this.carts.values()) {
      const hoursSinceCreation = (now.getTime() - cart.createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceCreation >= this.cartExpiryHours && cart.status === PurchaseStatus.FRIO) {
        expiredCarts.push(cart);
      }
    }

    console.log(`🔍 Encontrados ${expiredCarts.length} carrinhos expirados`);

    for (const cart of expiredCarts) {
      await this.handleExpiredCart(cart);
    }
  }

  /**
   * Trata carrinho expirado
   */
  private async handleExpiredCart(cart: CartData): Promise<void> {
    try {
      const hoursSinceCreation = (new Date().getTime() - cart.createdAt.getTime()) / (1000 * 60 * 60);
      
      // Determina qual mensagem enviar baseado no tempo
      let messageType: '1h' | '2h' | '3h' | null = null;
      
      if (hoursSinceCreation >= 3) {
        messageType = '3h';
      } else if (hoursSinceCreation >= 2) {
        messageType = '2h';
      } else if (hoursSinceCreation >= 1) {
        messageType = '1h';
      }

      if (messageType) {
        await this.sendToN8N({
          action: 'expired_cart',
          cartId: cart.id,
          userId: cart.userId,
          userPhone: cart.userPhone,
          userName: cart.userName,
          productName: cart.productName,
          cartValue: cart.cartValue,
          hoursSinceCreation: Math.floor(hoursSinceCreation),
          messageType,
          status: cart.status,
          createdAt: cart.createdAt.toISOString()
        });
      }
    } catch (error) {
      console.error(`❌ Erro ao processar carrinho expirado ${cart.id}:`, error);
    }
  }

  /**
   * Trata evento de início de checkout
   */
  private async handleBeginCheckout(cart: CartData, event: PurchaseEvent): Promise<void> {
    cart.status = PurchaseStatus.MORNO;
    
    await this.sendToN8N({
      action: 'begin_checkout',
      cartId: cart.id,
      userId: cart.userId,
      userPhone: cart.userPhone,
      userName: cart.userName,
      productName: cart.productName,
      cartValue: cart.cartValue,
      status: PurchaseStatus.MORNO,
      timestamp: event.timestamp.toISOString()
    });
  }

  /**
   * Trata evento de adição de informação de pagamento
   */
  private async handleAddPaymentInfo(cart: CartData, event: PurchaseEvent): Promise<void> {
    cart.status = PurchaseStatus.QUENTE;
    
    await this.sendToN8N({
      action: 'add_payment_info',
      cartId: cart.id,
      userId: cart.userId,
      userPhone: cart.userPhone,
      userName: cart.userName,
      productName: cart.productName,
      cartValue: cart.cartValue,
      status: PurchaseStatus.QUENTE,
      timestamp: event.timestamp.toISOString()
    });
  }

  /**
   * Trata evento de compra concluída
   */
  private async handlePurchase(cart: CartData, event: PurchaseEvent): Promise<void> {
    cart.status = PurchaseStatus.CONCLUIDO;
    
    // Remove da fila de monitoramento
    this.carts.delete(cart.id);
    
    await this.sendToN8N({
      action: 'purchase',
      cartId: cart.id,
      userId: cart.userId,
      userPhone: cart.userPhone,
      userName: cart.userName,
      productName: cart.productName,
      cartValue: cart.cartValue,
      status: PurchaseStatus.CONCLUIDO,
      timestamp: event.timestamp.toISOString()
    });
  }

  /**
   * Envia dados para o webhook do n8n
   */
  private async sendToN8N(data: any): Promise<void> {
    try {
      const response = await axios.post(this.n8nWebhookUrl, data, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`✅ Dados enviados para n8n: ${data.action} - Status: ${response.status}`);
    } catch (error: any) {
      console.error('❌ Erro ao enviar para n8n:', error.message);
      throw error;
    }
  }

  /**
   * Gera ID único para o carrinho
   */
  private getCartId(userId: string, productId?: string): string {
    return productId ? `${userId}_${productId}` : userId;
  }

  /**
   * Obtém estatísticas dos carrinhos
   */
  getStats(): {
    totalCarts: number;
    byStatus: Record<PurchaseStatus, number>;
    expiredCarts: number;
  } {
    const stats = {
      totalCarts: this.carts.size,
      byStatus: {
        [PurchaseStatus.FRIO]: 0,
        [PurchaseStatus.MORNO]: 0,
        [PurchaseStatus.QUENTE]: 0,
        [PurchaseStatus.CONCLUIDO]: 0
      },
      expiredCarts: 0
    };

    const now = new Date();
    for (const cart of this.carts.values()) {
      stats.byStatus[cart.status]++;
      
      const hoursSinceCreation = (now.getTime() - cart.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation >= this.cartExpiryHours && cart.status === PurchaseStatus.FRIO) {
        stats.expiredCarts++;
      }
    }

    return stats;
  }
}
```

## 3. Servidor HTTP para receber eventos

```typescript:src/server.ts
import express from 'express';
import cors from 'cors';
import { EventMonitor, PurchaseEvent, PurchaseStatus } from './monitor/EventMonitor';

const app = express();
const port = process.env.PORT || 3000;

// Configuração
const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';
const checkInterval = parseInt(process.env.CHECK_INTERVAL || '1800000');
const cartExpiryHours = parseInt(process.env.CART_EXPIRY_HOURS || '6');

// Inicializa monitor
const monitor = new EventMonitor(n8nWebhookUrl, checkInterval, cartExpiryHours);
monitor.start();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    stats: monitor.getStats()
  });
});

// Endpoint para receber eventos da plataforma
app.post('/webhook/event', async (req, res) => {
  try {
    const { userId, userPhone, userName, eventType, productId, productName, cartValue, metadata } = req.body;

    // Validação básica
    if (!userId || !userPhone || !eventType) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: userId, userPhone, eventType' 
      });
    }

    // Mapeia eventType para status
    const statusMap: Record<string, PurchaseStatus> = {
      'cart': PurchaseStatus.FRIO,
      'begin_checkout': PurchaseStatus.MORNO,
      'add_payment_info': PurchaseStatus.QUENTE,
      'purchase': PurchaseStatus.CONCLUIDO
    };

    const event: PurchaseEvent = {
      userId,
      userPhone,
      userName,
      eventType,
      status: statusMap[eventType] || PurchaseStatus.FRIO,
      productId,
      productName,
      cartValue,
      timestamp: new Date(),
      createdAt: new Date(),
      metadata
    };

    await monitor.processEvent(event);

    res.json({ 
      success: true, 
      message: 'Evento processado com sucesso',
      eventId: `${userId}_${Date.now()}`
    });
  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ 
      error: 'Erro ao processar evento',
      message: error.message 
    });
  }
});

// Endpoint para obter estatísticas
app.get('/stats', (req, res) => {
  res.json(monitor.getStats());
});

// Inicia servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📡 Webhook n8n: ${n8nWebhookUrl}`);
  console.log(`⏰ Intervalo de verificação: ${checkInterval / 60000} minutos`);
  console.log(`⏳ Expiração de carrinho: ${cartExpiryHours} horas`);
});
```

## 4. Package.json

```json:package.json
{
  "name": "voomp-whatsapp-monitor",
  "version": "1.0.0",
  "description": "Sistema de recuperação automática de vendas para Voomp",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "watch": "tsc --watch"
  },
  "keywords": ["voomp", "whatsapp", "n8n", "sales", "recovery"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.2",
    "ts-node-dev": "^2.0.0"
  }
}
```

## 5. TypeScript Config

```json:tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 6. Dockerfile para o monitor

```dockerfile:Dockerfile.monitor
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

## 7. Arquivo .env de exemplo

```env:.env.example
# N8N Configuration
N8N_WEBHOOK_URL=http://localhost:5678/webhook

# Evolution API Configuration
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=voomp_evolution_key_2024

# Monitor Configuration
PORT=3000
CHECK_INTERVAL=1800000
CART_EXPIRY_HOURS=6

# Database (se necessário)
DATABASE_URL=postgresql://user:password@localhost:5432/voomp
```

## 8. README com instruções

```markdown:README.md
# Voomp WhatsApp - Sistema de Recuperação de Vendas

Sistema automatizado de recuperação de vendas e geração de métricas para infoprodutores, integrado com n8n, Evolution API e WhatsApp.

## 🚀 Início Rápido

### Pré-requisitos
- Docker e Docker Compose
- Node.js 18+ (para desenvolvimento local)

### Instalação

1. Clone o repositório
2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

3. Inicie os serviços:
```bash
docker-compose up -d
```

4. Acesse:
- **n8n**: http://localhost:5678 (admin/admin123)
- **Evolution API**: http://localhost:8080
- **Monitor API**: http://localhost:3000

## 📊 Ciclo de Vida de Compra

- **Carrinho** → Status: `FRIO`
- **begin_checkout** → Status: `MORNO`
- **add_payment_info** → Status: `QUENTE`
- **Purchase** → Status: `CONCLUIDO`

## 🔄 Fluxo de Funcionamento

1. O script monitora eventos de compra da plataforma
2. A cada 30 minutos, verifica carrinhos com mais de 6 horas
3. Dispara webhooks para o n8n com os dados do evento
4. n8n processa e envia mensagens via WhatsApp (Evolution API)
5. Métricas são registradas no Google Sheets

## 📡 API Endpoints

### POST /webhook/event
Recebe eventos da plataforma Voomp

```json
{
  "userId": "user123",
  "userPhone": "5511999999999",
  "userName": "João Silva",
  "eventType": "cart",
  "productId": "prod123",
  "productName": "Curso de Marketing",
  "cartValue": 497.00
}
```

### GET /health
Status do sistema e estatísticas

### GET /stats
Estatísticas detalhadas dos carrinhos

## 🔧 Configuração do n8n

1. Crie um workflow no n8n
2. Adicione um Webhook node para receber os eventos
3. Configure o node do Evolution API para enviar mensagens
4. Adicione integração com Google Sheets para métricas
5. Configure mensagens personalizadas baseadas no `messageType`:
   - `1h`: "Não perca essa oportunidade"
   - `2h`: "As vagas estão acabando"
   - `3h`: "Oferta especial (bônus/cupom)"

## 📝 Variáveis de Ambiente

- `N8N_WEBHOOK_URL`: URL do webhook do n8n
- `CHECK_INTERVAL`: Intervalo de verificação em ms (padrão: 1800000 = 30min)
- `CART_EXPIRY_HOURS`: Horas para considerar carrinho expirado (padrão: 6)
```

## Próximos passos

1. Configurar o n8n: criar workflows para processar os eventos e enviar mensagens
2. Conectar Evolution API: configurar instância do WhatsApp
3. Integrar Google Sheets: salvar métricas e histórico
4. Personalizar mensagens: ajustar templates conforme necessidade

Quer que eu detalhe alguma parte específica ou crie os workflows do n8n?

