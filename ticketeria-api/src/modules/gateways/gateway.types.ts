/**
 * Abstração de gateway de pagamento.
 * Asaas, Pagar.me e Mercado Pago implementam essa interface.
 *
 * Auditoria CTO 2026-05 — gap 4.6
 */

export type GatewayProvider = 'asaas' | 'pagarme' | 'mercadopago' | 'stripe';

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

export interface CreatePaymentInput {
  /** Identificador externo do cliente no gateway. */
  customerExternalId: string;
  /** Identificador no nosso sistema (orderId). */
  internalReference: string;
  amountCents: number;
  currency?: string; // BRL default
  method: PaymentMethod;
  description?: string;
  /** Split — valores em cents para cada destinatário. */
  splits?: Array<{ recipientGatewayId: string; amountCents: number }>;
  /** Metadata livre. */
  metadata?: Record<string, unknown>;
  /** Cartão tokenizado (se método = credit_card). */
  cardToken?: string;
  /** TTL para Pix/boleto (em horas). */
  expiresInHours?: number;
}

export interface CreatePaymentOutput {
  provider: GatewayProvider;
  gatewayPaymentId: string;
  status: 'pending' | 'paid' | 'rejected' | 'cancelled';
  pixCopyPaste?: string;
  pixQrCode?: string;
  invoiceUrl?: string;
  raw?: unknown;
}

export interface CreateCustomerInput {
  email: string;
  name: string;
  cpfCnpj: string;
  phone?: string;
}

export interface RefundInput {
  gatewayPaymentId: string;
  amountCents?: number; // total se omitido
  reason?: string;
}

export interface PaymentGateway {
  readonly provider: GatewayProvider;

  /** Verifica se o gateway está saudável (1 chamada barata). */
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number; detail?: string }>;

  /** Garante customer no gateway, retorna externalId. */
  ensureCustomer(input: CreateCustomerInput): Promise<{ externalId: string }>;

  /** Cria pagamento. */
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput>;

  /** Reembolsa parcial ou total. */
  refund(input: RefundInput): Promise<{ refundedCents: number; status: string }>;

  /** Valida assinatura de webhook. */
  verifyWebhook(headers: Record<string, string>, rawBody: string): boolean;
}
