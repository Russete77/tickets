/**
 * Registry com fallback automático entre gateways.
 *
 * Estratégia:
 *   1. Tenta `primary` (Asaas por default).
 *   2. Se primary lançar exceção (timeout, 5xx, circuit breaker open),
 *      tenta `secondary` (Pagar.me) — *somente para criação de pagamento*.
 *   3. Reembolsos e webhooks roteiam pelo `provider` salvo no Order.
 *
 * Auditoria CTO 2026-05 — gap 4.6
 */
import { logger } from '../../shared/logger';
import { paymentFailoverCounter } from '../../shared/metrics';
import { AsaasGateway } from './asaas.gateway';
import { PagarmeGateway } from './pagarme.gateway';
import {
  CreatePaymentInput,
  CreatePaymentOutput,
  GatewayProvider,
  PaymentGateway,
  RefundInput,
  CreateCustomerInput,
} from './gateway.types';

export class GatewayRegistry {
  private gateways = new Map<GatewayProvider, PaymentGateway>();
  private primary: GatewayProvider;
  private secondary: GatewayProvider | null;

  constructor(primary: GatewayProvider = 'asaas', secondary: GatewayProvider | null = 'pagarme') {
    this.primary = primary;
    this.secondary = secondary;
    this.register(new AsaasGateway());
    if (process.env.PAGARME_SECRET_KEY) {
      this.register(new PagarmeGateway());
    } else {
      this.secondary = null;
    }
  }

  register(gw: PaymentGateway) {
    this.gateways.set(gw.provider, gw);
  }

  get(provider: GatewayProvider): PaymentGateway {
    const gw = this.gateways.get(provider);
    if (!gw) throw new Error(`Gateway ${provider} não registrado`);
    return gw;
  }

  /**
   * Cria pagamento com fallback automático.
   * Retorna também qual provider efetivou.
   */
  async createPaymentWithFailover(input: CreatePaymentInput): Promise<CreatePaymentOutput> {
    const primary = this.get(this.primary);
    try {
      return await primary.createPayment(input);
    } catch (err) {
      logger.warn(
        { err, provider: primary.provider },
        'Gateway primário falhou, tentando secundário',
      );
      paymentFailoverCounter.inc({ from: primary.provider, to: this.secondary ?? 'none' });

      if (!this.secondary) throw err;

      const secondary = this.get(this.secondary);
      // Pagar.me precisa de customer próprio — aceita o externalId vindo do Asaas
      // não vai funcionar. O caller deve garantir customer no fallback.
      // Por isso secondary normalmente é alimentado via ensureCustomerOnAll(...).
      return secondary.createPayment(input);
    }
  }

  async ensureCustomerOnAll(input: CreateCustomerInput): Promise<Record<GatewayProvider, string>> {
    const result = {} as Record<GatewayProvider, string>;
    for (const [provider, gw] of this.gateways) {
      try {
        const { externalId } = await gw.ensureCustomer(input);
        result[provider] = externalId;
      } catch (err) {
        logger.warn({ err, provider }, 'ensureCustomer falhou — ignorado');
      }
    }
    return result;
  }

  refund(provider: GatewayProvider, input: RefundInput) {
    return this.get(provider).refund(input);
  }
}

export const gatewayRegistry = new GatewayRegistry();
