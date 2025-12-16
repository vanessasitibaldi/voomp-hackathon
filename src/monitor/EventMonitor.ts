import axios from 'axios';
import { EventEmitter } from 'events';
import { PurchaseStatus } from '../constants';
import { PurchaseEvent, CartData } from '../types';

export class EventMonitor extends EventEmitter {
  private n8nWebhookUrl: string;
  private checkInterval: number;
  private carts: Map<string, CartData> = new Map();
  private intervalId?: NodeJS.Timeout;

  // Tempos para recuperação
  private readonly COLD_TIMEOUT_HOURS = 24;  // cart → 24h
  private readonly WARM_TIMEOUT_HOURS = 3;   // begin_checkout → 3h
  private readonly HOT_TIMEOUT_HOURS = 1;    // add_payment_info → 1h

  constructor(n8nWebhookUrl: string, checkInterval: number = 3600000) {
    super();
    this.n8nWebhookUrl = n8nWebhookUrl;
    this.checkInterval = checkInterval;
  }

  start(): void {
    console.log('🚀 Monitor iniciado');
    this.intervalId = setInterval(() => {
      this.checkRecovery();
    }, this.checkInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  async processEvent(event: PurchaseEvent): Promise<void> {
    const cartId = `${event.userId}_${event.productId || 'default'}`;
    let cart = this.carts.get(cartId);

    if (!cart) {
      cart = {
        id: cartId,
        userId: event.userId,
        userPhone: event.userPhone,
        userName: event.userName,
        status: PurchaseStatus.COLD,
        createdAt: event.createdAt,
        lastEventAt: event.timestamp,
        productId: event.productId,
        productName: event.productName,
        cartValue: event.cartValue,
        currency: event.currency || 'BRL',
        source: event.source,
        campaign: event.campaign,
        hasErrors: false,
        errorCount: 0,
        events: []
      };
      this.carts.set(cartId, cart);
    }

    // Atualiza informações
    if (event.productName) cart.productName = event.productName;
    if (event.cartValue) cart.cartValue = event.cartValue;
    if (event.source) cart.source = event.source;
    
    // Processa erros
    if (event.hasError || event.error) {
      cart.hasErrors = true;
      cart.errorCount = (cart.errorCount || 0) + 1;
      cart.lastError = event.error;
    }
    
    // Adiciona evento
    cart.lastEventAt = event.timestamp;
    cart.events.push(event);
    cart.status = this.determineStatus(cart);

    // Verifica se houve recovery antes (para purchase)
    const hadRecovery = event.eventType === 'purchase' 
      ? cart.events.some(e => e.metadata?.recoverySent === true)
      : false;

    // Garante que o timestamp seja sempre uma string ISO válida
    const timestamp = event.timestamp && event.timestamp instanceof Date 
      ? event.timestamp.toISOString() 
      : new Date().toISOString();

    // Calcula horas desde o último evento
    const hoursSinceLastEvent = cart.lastEventAt && cart.lastEventAt instanceof Date
      ? Math.floor((new Date().getTime() - cart.lastEventAt.getTime()) / (1000 * 60 * 60))
      : 0;

    // Prepara payload em camelCase (padrão JSON) - o n8n pode mapear para PascalCase na planilha
    const payload = {
      timestamp: timestamp,
      action: event.eventType,
      status: cart.status,
      cartId: cart.id,
      userId: cart.userId || '',
      userPhone: cart.userPhone || '',
      userName: cart.userName || '',
      productName: cart.productName || '',
      cartValue: cart.cartValue || 0,
      currency: cart.currency || 'BRL',
      hoursSinceLastEvent: hoursSinceLastEvent
    };

    // Envia para n8n
    await this.sendToN8N(payload);

    // Se purchase com sucesso, remove da memória
    if (event.eventType === 'purchase' && !event.hasError) {
      this.carts.delete(cartId);
    }
  }

  private determineStatus(cart: CartData): PurchaseStatus {
    const hasPurchase = cart.events.some(e => e.eventType === 'purchase');
    const hasAddPaymentInfo = cart.events.some(e => e.eventType === 'add_payment_info');
    const hasBeginCheckout = cart.events.some(e => e.eventType === 'begin_checkout');

    if (hasPurchase) return PurchaseStatus.COMPLETED;
    if (hasAddPaymentInfo) return PurchaseStatus.HOT;
    if (hasBeginCheckout) return PurchaseStatus.WARM;
    return PurchaseStatus.COLD;
  }

  private async checkRecovery(): Promise<void> {
    const now = new Date();
    const cartsToRecover: CartData[] = [];

    for (const cart of this.carts.values()) {
      if (cart.status === PurchaseStatus.COMPLETED) {
        this.carts.delete(cart.id);
        continue;
      }

      const hoursSinceLastEvent = (now.getTime() - cart.lastEventAt.getTime()) / (1000 * 60 * 60);
      let needsRecovery = false;
      let timeoutHours = 0;

      switch (cart.status) {
        case PurchaseStatus.COLD:
          timeoutHours = this.COLD_TIMEOUT_HOURS;
          break;
        case PurchaseStatus.WARM:
          timeoutHours = this.WARM_TIMEOUT_HOURS;
          break;
        case PurchaseStatus.HOT:
          timeoutHours = this.HOT_TIMEOUT_HOURS;
          break;
      }

      needsRecovery = hoursSinceLastEvent >= timeoutHours && !this.hasSentRecovery(cart);

      if (needsRecovery) {
        cartsToRecover.push(cart);
      }
    }

    for (const cart of cartsToRecover) {
      await this.sendRecovery(cart);
    }
  }

  private hasSentRecovery(cart: CartData): boolean {
    return cart.events.some(e => e.metadata?.recoverySent === true);
  }

  private async sendRecovery(cart: CartData): Promise<void> {
    const hoursSinceLastEvent = Math.floor((new Date().getTime() - cart.lastEventAt.getTime()) / (1000 * 60 * 60));
    const timestamp = new Date().toISOString();
    
    // Prepara payload em camelCase (padrão JSON) - o n8n pode mapear para PascalCase na planilha
    const payload = {
      timestamp: timestamp,
      action: 'recovery',
      status: cart.status,
      cartId: cart.id,
      userId: cart.userId || '',
      userPhone: cart.userPhone || '',
      userName: cart.userName || '',
      productName: cart.productName || '',
      cartValue: cart.cartValue || 0,
      currency: cart.currency || 'BRL',
      hoursSinceLastEvent: hoursSinceLastEvent
    };

    await this.sendToN8N(payload);

    // Marca que enviou
    cart.events.push({
      userId: cart.userId,
      userPhone: cart.userPhone,
      eventType: 'cart',
      status: cart.status,
      timestamp: new Date(),
      createdAt: new Date(),
      metadata: { recoverySent: true }
    } as PurchaseEvent);
  }

  private async sendToN8N(data: any): Promise<void> {
    try {
      // Garante que o timestamp sempre existe
      if (!data.timestamp) {
        data.timestamp = new Date().toISOString();
      }

      // Log do payload completo para debug
      console.log(`📤 Enviando para n8n:`, JSON.stringify(data, null, 2));

      const response = await axios.post(this.n8nWebhookUrl, data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      
      console.log(`✅ Enviado para n8n: ${data.action} - ${data.status} - timestamp: ${data.timestamp}`);
      console.log(`📥 Resposta n8n:`, response.status, response.statusText);
    } catch (error: any) {
      console.error(`❌ Erro ao enviar para n8n: ${error.message}`);
      if (error.response) {
        console.error(`📥 Resposta de erro:`, error.response.status, error.response.data);
      }
      console.error(`📤 Payload que falhou:`, JSON.stringify(data, null, 2));
    }
  }

}
