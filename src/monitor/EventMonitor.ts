import axios from 'axios';
import { PurchaseStatus } from '../constants';
import { PurchaseEvent, CartData } from '../types';

/**
 * Monitor de eventos de compra e recuperação de carrinhos abandonados
 * 
 * Responsabilidades:
 * 1. Rastrear carrinhos em memória
 * 2. Detectar carrinhos abandonados
 * 3. Enviar eventos de recovery (remarketing)
 * 4. Identificar compras recuperadas
 * 5. Enviar todos os eventos para n8n/Google Sheets
 */
export class EventMonitor {
  private n8nWebhookUrl: string;
  private carts: Map<string, CartData> = new Map(); // Armazena carrinhos ativos
  private intervalId?: NodeJS.Timeout;
  private readonly checkInterval: number = 3600000; // 1 hora

  // Tempo de espera antes de enviar recovery por status
  private readonly TIMEOUT_HOURS = {
    [PurchaseStatus.COLD]: 24,  // Apenas cart → espera 24h
    [PurchaseStatus.WARM]: 1,   // Begin_checkout → espera 3h
    [PurchaseStatus.HOT]: 0.30     // Add_payment_info → espera 1h
  };

  constructor(n8nWebhookUrl: string, checkInterval?: number) {
    this.n8nWebhookUrl = n8nWebhookUrl;
    if (checkInterval) this.checkInterval = checkInterval;
  }

  /**
   * Inicia o monitoramento periódico de carrinhos abandonados
   */
  start(): void {
    console.log('🚀 Monitor de recovery iniciado');
    this.intervalId = setInterval(() => {
      this.checkRecovery();
    }, this.checkInterval);
  }

  /**
   * Para o monitoramento
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('🛑 Monitor parado');
    }
  }

  /**
   * Processa um evento de compra (cart, begin_checkout, add_payment_info, purchase, error)
   * 
   * Fluxo:
   * 1. Identifica o carrinho (cria se não existir)
   * 2. Atualiza o carrinho com novos dados
   * 3. Envia evento para n8n/Google Sheets
   * 4. Remove carrinho da memória se compra foi concluída
   */
  async processEvent(event: PurchaseEvent): Promise<void> {
    const cartId = `${event.userId}_${event.productId || 'default'}`;
    
    // Busca ou cria carrinho
    let cart = this.carts.get(cartId);
    if (!cart) {
      cart = this.createCart(cartId, event);
      this.carts.set(cartId, cart);
    }

    // Atualiza dados do carrinho
    this.updateCart(cart, event);
    
    // Prepara e envia dados para n8n
    const payload = this.buildPayload(cart, event);
    await this.sendToN8N(payload);

    // Remove carrinho da memória se compra foi finalizada com sucesso
    if (event.eventType === 'purchase' && !event.hasError) {
      this.carts.delete(cartId);
      console.log(`🎉 Carrinho ${cartId} removido - compra concluída`);
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

  /**
   * Constrói o payload que será enviado para n8n/Google Sheets
   * 
   * Campos importantes:
   * - recovered: true se usuário voltou após recovery (remarketing)
   * - recoveryValue: valor da compra recuperada
   * - hoursSinceLastEvent: tempo desde último evento
   */
  private buildPayload(cart: CartData, event: PurchaseEvent): any {
    // Verifica se já foi enviado recovery para este carrinho
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

    // Se é uma compra, adiciona informações de recovery
    if (event.eventType === 'purchase') {
      payload.recovered = hadRecovery; // true = voltou do remarketing
      payload.recoveryValue = hadRecovery ? (cart.totalValue || cart.cartValue || 0) : 0;
      payload.recoveryStatus = hadRecovery ? cart.status : null;
    }
    
    // Se é um erro, adiciona detalhes
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

  /**
   * Verifica carrinhos abandonados e envia mensagens de recovery
   * 
   * Executado periodicamente (a cada 1 hora por padrão)
   * 
   * Timeouts:
   * - COLD (cart): 24h
   * - WARM (begin_checkout): 3h
   * - HOT (add_payment_info): 1h
   */
  private async checkRecovery(): Promise<void> {
    console.log(`🔍 Verificando ${this.carts.size} carrinhos...`);
    
    for (const cart of this.carts.values()) {
      // Remove carrinhos já finalizados
      if (cart.status === PurchaseStatus.COMPLETED) {
        this.carts.delete(cart.id);
        continue;
      }

      // Calcula tempo desde último evento
      const hoursSinceLastEvent = (Date.now() - cart.lastEventAt.getTime()) / (1000 * 60 * 60);
      const timeoutHours = this.TIMEOUT_HOURS[cart.status] || 0;
      const alreadySentRecovery = cart.events.some(e => e.metadata?.recoverySent);

      // Envia recovery se passou o tempo e ainda não enviou
      if (hoursSinceLastEvent >= timeoutHours && !alreadySentRecovery) {
        console.log(`📧 Enviando recovery para carrinho ${cart.id} (${cart.status})`);
        await this.sendRecovery(cart);
      }
    }
  }

  /**
   * Envia evento de recovery (remarketing) para n8n
   * 
   * O n8n irá:
   * 1. Salvar no Google Sheets
   * 2. Enviar mensagem de WhatsApp para o usuário
   * 
   * Marca no histórico do carrinho que recovery foi enviado
   */
  private async sendRecovery(cart: CartData): Promise<void> {
    const hoursSinceLastEvent = Math.floor((Date.now() - cart.lastEventAt.getTime()) / 3600000);
    
    // Envia evento de recovery para n8n
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

    // Marca no histórico que recovery foi enviado (usado para identificar compras recuperadas)
    cart.events.push({
      userId: cart.userId,
      userPhone: cart.userPhone,
      eventType: 'cart',
      status: cart.status,
      timestamp: new Date(),
      createdAt: new Date(),
      metadata: { recoverySent: true } // ⭐ Flag importante!
    } as PurchaseEvent);
  }

  /**
   * Envia dados para n8n via webhook
   * 
   * O n8n irá processar e salvar no Google Sheets
   */
  private async sendToN8N(data: any): Promise<void> {
    try {
      await axios.post(this.n8nWebhookUrl, data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      console.log(`✅ Evento enviado: ${data.action} [${data.status}]`);
    } catch (error: any) {
      console.error(`❌ Erro ao enviar para n8n: ${error.message}`);
    }
  }
}
