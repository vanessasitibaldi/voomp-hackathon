import axios from 'axios';
import { PurchaseStatus } from '../constants';
import { PurchaseEvent, CartData } from '../types';

export class EventMonitor {
  private n8nWebhookUrl: string;
  private carts: Map<string, CartData> = new Map();
  private intervalId?: NodeJS.Timeout;
  private readonly checkInterval: number = 3600000; // 1 hora

  // Timeouts para envio de recovery
  private readonly TIMEOUT_HOURS = {
    [PurchaseStatus.COLD]: 24,
    [PurchaseStatus.WARM]: 3,
    [PurchaseStatus.HOT]: 1
  };

  constructor(n8nWebhookUrl: string, checkInterval?: number) {
    this.n8nWebhookUrl = n8nWebhookUrl;
    if (checkInterval) this.checkInterval = checkInterval;
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
    const cartId = event.productId || 'default';
    
    // Busca ou cria carrinho
    let cart = this.carts.get(cartId);
    if (!cart) {
      cart = this.createCart(cartId, event);
      this.carts.set(cartId, cart);
    }

    // Atualiza dados do carrinho
    this.updateCart(cart, event);
    
    // Prepara e envia dados para N8N
    const payload = this.buildPayload(cart, event);
    await this.sendToN8N(payload);

    // Remove carrinho se compra finalizada
    if (event.eventType === 'purchase' && !event.hasError) {
      this.carts.delete(cartId);
    }
  }

  private createCart(cartId: string, event: PurchaseEvent): CartData {
    return {
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
  }

  private updateCart(cart: CartData, event: PurchaseEvent): void {
    // Atualiza dados do usuário e produto (mantém valor anterior se novo estiver vazio)
    cart.userPhone = event.userPhone || cart.userPhone;
    cart.userName = event.userName || cart.userName;
    cart.userEmail = event.userEmail || cart.userEmail;
    cart.userCPF = event.userCPF || cart.userCPF;
    cart.productId = event.productId || cart.productId;
    cart.productName = event.productName || cart.productName;
    cart.productAuthor = event.productAuthor || cart.productAuthor;
    cart.productType = event.productType || cart.productType;
    cart.cartValue = event.cartValue || cart.cartValue;
    cart.totalValue = event.totalValue || cart.totalValue;
    cart.currency = event.currency || cart.currency || 'BRL';
    
    // Registra erros
    if (event.hasError || event.error) {
      cart.hasErrors = true;
      cart.errorCount = (cart.errorCount || 0) + 1;
      cart.lastError = event.error;
    }
    
    // Atualiza status e histórico
    cart.lastEventAt = event.timestamp;
    cart.events.push(event);
    cart.status = this.determineStatus(cart);
  }

  private buildPayload(cart: CartData, event: PurchaseEvent): any {
    const hadRecovery = cart.events.some(e => e.metadata?.recoverySent);
    const hoursSinceLastEvent = Math.floor((Date.now() - cart.lastEventAt.getTime()) / 3600000);

    const payload: any = {
      timestamp: event.timestamp.toISOString(),
      action: event.eventType,
      status: cart.status,
      cartId: cart.id,
      userId: cart.userId,
      userPhone: cart.userPhone || '',
      userName: cart.userName || '',
      userEmail: cart.userEmail || '',
      userCPF: cart.userCPF || '',
      productId: cart.productId || '',
      productName: cart.productName || '',
      productAuthor: cart.productAuthor || '',
      productType: cart.productType || '',
      cartValue: cart.cartValue || 0,
      totalValue: cart.totalValue || 0,
      currency: cart.currency || 'BRL',
      paymentMethod: event.paymentMethod || '',
      installments: event.installments || 0,
      hasInstallments: event.hasInstallments || false,
      discountCode: event.discountCode || '',
      discountValue: event.discountValue || 0,
      hoursSinceLastEvent
    };

    // Adiciona dados específicos de compra finalizada
    if (event.eventType === 'purchase') {
      payload.recovered = hadRecovery;
      payload.recoveryValue = hadRecovery ? (cart.totalValue || cart.cartValue || 0) : 0;
    }
    
    // Adiciona dados de erro
    if (event.eventType === 'error') {
      payload.statusCode = event.statusCode || 0;
      payload.errorMessage = event.errorMessage || '';
    }

    return payload;
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
    for (const cart of this.carts.values()) {
      // Remove carrinhos finalizados
      if (cart.status === PurchaseStatus.COMPLETED) {
        this.carts.delete(cart.id);
        continue;
      }

      // Verifica se precisa enviar recovery
      const hoursSinceLastEvent = (Date.now() - cart.lastEventAt.getTime()) / (1000 * 60 * 60);
      const timeoutHours = this.TIMEOUT_HOURS[cart.status] || 0;
      const alreadySentRecovery = cart.events.some(e => e.metadata?.recoverySent);

      if (hoursSinceLastEvent >= timeoutHours && !alreadySentRecovery) {
        await this.sendRecovery(cart);
      }
    }
  }

  private async sendRecovery(cart: CartData): Promise<void> {
    const hoursSinceLastEvent = Math.floor((Date.now() - cart.lastEventAt.getTime()) / 3600000);
    
    // Envia evento de recovery para N8N
    await this.sendToN8N({
      timestamp: new Date().toISOString(),
      action: 'recovery',
      status: cart.status,
      cartId: cart.id,
      userId: cart.userId,
      userPhone: cart.userPhone || '',
      userName: cart.userName || '',
      userEmail: cart.userEmail || '',
      userCPF: cart.userCPF || '',
      productId: cart.productId || '',
      productName: cart.productName || '',
      productAuthor: cart.productAuthor || '',
      productType: cart.productType || '',
      cartValue: cart.cartValue || 0,
      currency: cart.currency || 'BRL',
      hoursSinceLastEvent
    });

    // Marca que recovery foi enviado
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
