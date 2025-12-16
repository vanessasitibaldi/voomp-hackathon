import express from 'express';
import cors from 'cors';
import path from 'path';
import { EventMonitor } from './monitor/EventMonitor';
import { PurchaseEvent } from './types';
import { PurchaseStatus } from './constants';

const app = express();
const port = process.env.PORT || 3000;
const n8nWebhookUrl = 'http://localhost:5678/webhook/event';
const checkInterval = 3600000; 

const monitor = new EventMonitor(n8nWebhookUrl, checkInterval);
monitor.start();

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());


app.post('/event', async (req, res) => {
  try {
    const { userId, userPhone, eventType, ...rest } = req.body;

    if (!userId || !eventType) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: userId e eventType' 
      });
    }

    const statusMap: Record<string, PurchaseStatus> = {
      'cart': PurchaseStatus.COLD,
      'begin_checkout': PurchaseStatus.WARM,
      'add_payment_info': PurchaseStatus.HOT,
      'purchase': PurchaseStatus.COMPLETED
    };

    const event: PurchaseEvent = {
      userId,
      userPhone: userPhone || '',
      userName: rest.userName,
      eventType,
      status: statusMap[eventType] || PurchaseStatus.COLD,
      productId: rest.productId,
      productName: rest.productName,
      productCategory: rest.productCategory,
      cartValue: rest.cartValue,
      currency: rest.currency || 'BRL',
      paymentMethod: rest.paymentMethod,
      paymentGateway: rest.paymentGateway,
      installments: rest.installments,
      discountCode: rest.discountCode,
      discountValue: rest.discountValue,
      error: rest.error ? {
        code: rest.error.code,
        message: rest.error.message,
        type: rest.error.type || 'unknown',
        gateway: rest.error.gateway,
        paymentMethod: rest.error.paymentMethod
      } : undefined,
      hasError: rest.hasError || !!rest.error,
      source: rest.source,
      campaign: rest.campaign,
      timestamp: new Date(),
      createdAt: new Date(),
      metadata: rest.metadata || {}
    };

    await monitor.processEvent(event);

    res.json({ 
      success: true, 
      message: 'Evento processado com sucesso',
      eventId: `${userId}_${Date.now()}`,
      status: event.status
    });
  } catch (error: any) {
    console.error('Erro ao processar evento:', error);
    res.status(500).json({ 
      error: 'Erro ao processar evento',
      message: error.message 
    });
  }
});


if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📡 Webhook n8n: ${n8nWebhookUrl}`);
  console.log(`⏰ Verificando recuperação a cada ${checkInterval / 60000} minutos`);
});
