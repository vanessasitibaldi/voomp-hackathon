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
    const { userId, eventType } = req.body;

    if (!userId || !eventType) {
      return res.status(400).json({ error: 'userId e eventType obrigatórios' });
    }

    const statusMap: Record<string, PurchaseStatus> = {
      cart: PurchaseStatus.COLD,
      begin_checkout: PurchaseStatus.WARM,
      add_payment_info: PurchaseStatus.HOT,
      purchase: PurchaseStatus.COMPLETED,
      error: PurchaseStatus.ERROR
    };

    const event: PurchaseEvent = {
      ...req.body,
      status: statusMap[eventType] || PurchaseStatus.COLD,
      timestamp: new Date(),
      createdAt: new Date()
    };

    await monitor.processEvent(event);

    res.json({ 
      success: true,
      eventId: `${userId}_${Date.now()}`,
      status: event.status
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
