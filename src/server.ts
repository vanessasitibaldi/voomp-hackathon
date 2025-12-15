import express from 'express';
import cors from 'cors';
import path from 'path';
import { EventMonitor} from './monitor/EventMonitor';
import { PurchaseEvent } from './types';
import { PurchaseStatus } from './constants';


const app = express();
const port = process.env.PORT || 3000;

// Configuração
const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';
const checkInterval = parseInt(process.env.CHECK_INTERVAL || '3600000'); // 1 hora

// Inicializa monitor
const monitor = new EventMonitor(n8nWebhookUrl, checkInterval);
monitor.start();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    stats: monitor.getStats()
  });
});

// Endpoint para receber eventos da plataforma
app.post('/webhook/event', async (req: express.Request, res: express.Response) => {
  try {
    const {
      // Campos obrigatórios
      userId,
      userPhone,
      eventType,
      
      // Informações do usuário
      userName,
      
      // Informações do produto
      productId,
      productName,
      productCategory,
      cartValue,
      currency,
      
      // Informações de pagamento
      paymentMethod,
      paymentGateway,
      installments,
      discountCode,
      discountValue,
      
      // Informações de erro (especialmente importante para add_payment_info)
      error,
      hasError,
      
      // Informações de origem
      source,
      campaign,
      
      // Metadados (pode conter campos extras como utmSource, userAgent, etc)
      metadata
    } = req.body;

    // Validação básica
    if (!userId || !userPhone || !eventType) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: userId, userPhone, eventType' 
      });
    }

    // Mapeia eventType para status inicial (será recalculado pelo monitor)
    const statusMap: Record<string, PurchaseStatus> = {
      'cart': PurchaseStatus.COLD,
      'begin_checkout': PurchaseStatus.WARM,
      'add_payment_info': PurchaseStatus.HOT,
      'purchase': PurchaseStatus.COMPLETED
    };

    const event: PurchaseEvent = {
      userId,
      userPhone,
      userName,
      eventType,
      status: statusMap[eventType] || PurchaseStatus.COLD,
      
      // Informações do produto
      productId,
      productName,
      productCategory,
      cartValue,
      currency: currency || 'BRL',
      
      // Informações de pagamento
      paymentMethod,
      paymentGateway,
      installments,
      discountCode,
      discountValue,
      
      // Informações de erro
      error: error ? {
        code: error.code,
        message: error.message,
        type: error.type || 'unknown',
        gateway: error.gateway,
        paymentMethod: error.paymentMethod
      } : undefined,
      hasError: hasError || !!error,
      
      // Informações de origem
      source,
      campaign,
      
      // Timestamps
      timestamp: new Date(),
      createdAt: new Date(),
      
      // Metadados (pode conter campos extras como utmSource, userAgent, etc)
      metadata: {
        ...metadata,
        // Inclui campos extras no metadata se foram enviados
        ...(req.body.utmSource && { utmSource: req.body.utmSource }),
        ...(req.body.utmMedium && { utmMedium: req.body.utmMedium }),
        ...(req.body.utmCampaign && { utmCampaign: req.body.utmCampaign }),
        ...(req.body.userAgent && { userAgent: req.body.userAgent }),
        ...(req.body.ipAddress && { ipAddress: req.body.ipAddress }),
        ...(req.body.deviceType && { deviceType: req.body.deviceType }),
        ...(req.body.timeOnPage && { timeOnPage: req.body.timeOnPage }),
        ...(req.body.timeSinceLastEvent && { timeSinceLastEvent: req.body.timeSinceLastEvent }),
        ...(req.body.checkoutStep && { checkoutStep: req.body.checkoutStep }),
        ...(req.body.checkoutUrl && { checkoutUrl: req.body.checkoutUrl })
      }
    };

    await monitor.processEvent(event);

    res.json({ 
      success: true, 
      message: 'Evento processado com sucesso',
      eventId: `${userId}_${Date.now()}`,
      status: event.status,
      hasError: event.hasError
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
app.get('/stats', (req: express.Request, res: express.Response) => {
  res.json(monitor.getStats());
});

// Serve arquivos estáticos do frontend em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  
  app.get('*', (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Inicia servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📡 Webhook n8n: ${n8nWebhookUrl}`);
  console.log(`⏰ Verificando recuperação a cada ${checkInterval / 60000} minutos`);
});
