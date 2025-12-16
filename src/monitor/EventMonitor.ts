import axios from 'axios';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { PurchaseStatus } from '../constants';
import { PurchaseEvent, CartData } from '../types';

export class EventMonitor extends EventEmitter {
  private n8nWebhookUrl: string;
  private checkInterval: number;
  private carts: Map<string, CartData> = new Map();
  private intervalId?: NodeJS.Timeout;

  private readonly COLD_TIMEOUT_HOURS = 24;
  private readonly WARM_TIMEOUT_HOURS = 3;
  private readonly HOT_TIMEOUT_HOURS = 1;

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
        status: PurchaseStatus.COLD,
        createdAt: event.createdAt,
        lastEventAt: event.timestamp,
        hasErrors: false,
        errorCount: 0,
        events: []
      };
      this.carts.set(cartId, cart);
    }

    Object.assign(cart, {
      userName: event.userName || cart.userName,
      userEmail: event.userEmail || cart.userEmail,
      userCPF: event.userCPF || cart.userCPF,
      productId: event.productId || cart.productId,
      productName: event.productName || cart.productName,
      productAuthor: event.productAuthor || cart.productAuthor,
      productType: event.productType || cart.productType,
      cartValue: event.cartValue || cart.cartValue,
      totalValue: event.totalValue || cart.totalValue,
      currency: event.currency || cart.currency || 'BRL',
    });
    
    if (event.hasError || event.error) {
      cart.hasErrors = true;
      cart.errorCount = (cart.errorCount || 0) + 1;
      cart.lastError = event.error;
    }
    
    cart.lastEventAt = event.timestamp;
    cart.events.push(event);
    cart.status = this.determineStatus(cart);

    const hadRecovery = cart.events.some(e => e.metadata?.recoverySent);
    const recoveryEvent = hadRecovery ? cart.events.find(e => e.metadata?.recoverySent) : null;
    const hoursSinceLastEvent = Math.floor((Date.now() - cart.lastEventAt.getTime()) / 3600000);

    const payload: any = {
      timestamp: event.timestamp.toISOString(),
      action: event.eventType,
      status: cart.status,
      cartId: cart.id,
      userId: cart.userId,
      userPhone: cart.userPhone,
      userName: cart.userName,
      userEmail: cart.userEmail,
      userCPF: cart.userCPF,
      productId: cart.productId,
      productName: cart.productName,
      productAuthor: cart.productAuthor,
      productType: cart.productType,
      cartValue: cart.cartValue || 0,
      totalValue: event.totalValue || cart.totalValue || 0,
      currency: cart.currency,
      paymentMethod: event.paymentMethod,
      installments: event.installments || 0,
      hasInstallments: event.hasInstallments || false,
      discountCode: event.discountCode,
      discountValue: event.discountValue || 0,
      hoursSinceLastEvent
    };

    if (event.eventType === 'purchase') {
      payload.recovered = hadRecovery;
      payload.recoveryValue = hadRecovery ? (cart.totalValue || cart.cartValue || 0) : 0;
      payload.recoveryStatus = recoveryEvent?.status || null;
    }
    
    if (event.eventType === 'error') {
      payload.statusCode = event.statusCode;
      payload.errorMessage = event.errorMessage;
    }

    await this.sendToN8N(payload);

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

    for (const cart of this.carts.values()) {
      if (cart.status === PurchaseStatus.COMPLETED) {
        this.carts.delete(cart.id);
        continue;
      }

      const hoursSinceLastEvent = (now.getTime() - cart.lastEventAt.getTime()) / (1000 * 60 * 60);
      
      const timeoutMap: Record<string, number> = {
        [PurchaseStatus.COLD]: this.COLD_TIMEOUT_HOURS,
        [PurchaseStatus.WARM]: this.WARM_TIMEOUT_HOURS,
        [PurchaseStatus.HOT]: this.HOT_TIMEOUT_HOURS
      };
      const timeoutHours = timeoutMap[cart.status] || 0;

      const needsRecovery = hoursSinceLastEvent >= timeoutHours && !this.hasSentRecovery(cart);

      if (needsRecovery) {
        await this.sendRecovery(cart);
      }
    }
  }

  private hasSentRecovery(cart: CartData): boolean {
    return cart.events.some(e => e.metadata?.recoverySent === true);
  }

  private async sendRecovery(cart: CartData): Promise<void> {
    const hoursSinceLastEvent = Math.floor((Date.now() - cart.lastEventAt.getTime()) / 3600000);
    
    await this.sendToN8N({
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      action: 'recovery',
      status: cart.status,
      cartId: cart.id,
      userId: cart.userId,
      userPhone: cart.userPhone,
      userName: cart.userName,
      userEmail: cart.userEmail,
      userCPF: cart.userCPF,
      productId: cart.productId,
      productName: cart.productName,
      productAuthor: cart.productAuthor,
      productType: cart.productType,
      cartValue: cart.cartValue || 0,
      currency: cart.currency,
      hoursSinceLastEvent
    });

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
      await axios.post(this.n8nWebhookUrl, data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      console.log(`✅ ${data.action} - ${data.status}`);
    } catch (error: any) {
      console.error(`❌ Erro: ${error.message}`);
    }
  }

}
