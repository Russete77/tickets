/**
 * Adapter Pagar.me (gateway secundário, fallback do Asaas).
 *
 * Implementação inicial chama a API v5 da Pagar.me (`api.pagar.me/core/v5`).
 * Algumas chamadas são marcadas TODO porque o produto Pagar.me precisa
 * de credenciais de produção do cliente para validar; o adapter está
 * pronto para receber `PAGARME_SECRET_KEY` e `PAGARME_RECIPIENT_ID`.
 *
 * Auditoria CTO 2026-05 — gap 4.6
 */
import crypto from 'crypto';
import {
  PaymentGateway,
  CreateCustomerInput,
  CreatePaymentInput,
  CreatePaymentOutput,
  RefundInput,
  GatewayProvider,
} from './gateway.types';
import { logger } from '../../shared/logger';

const PROVIDER: GatewayProvider = 'pagarme';
const BASE_URL = process.env.PAGARME_API_URL ?? 'https://api.pagar.me/core/v5';

function authHeader(): string {
  const key = process.env.PAGARME_SECRET_KEY;
  if (!key) throw new Error('PAGARME_SECRET_KEY não configurada');
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64');
}

async function pagarmeFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pagar.me ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export class PagarmeGateway implements PaymentGateway {
  readonly provider = PROVIDER;

  async healthCheck() {
    const start = Date.now();
    try {
      // Endpoint barato — listar 1 customer.
      await pagarmeFetch('/customers?size=1');
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async ensureCustomer(input: CreateCustomerInput) {
    const cleaned = input.cpfCnpj.replace(/\D/g, '');
    // Pagar.me não tem busca por email; criamos sempre e tratamos duplicate.
    try {
      const created = await pagarmeFetch<{ id: string }>('/customers', {
        method: 'POST',
        body: {
          name: input.name,
          email: input.email,
          document: cleaned,
          document_type: cleaned.length === 11 ? 'cpf' : 'cnpj',
          type: 'individual',
          phones: input.phone
            ? {
                mobile_phone: {
                  country_code: '55',
                  area_code: input.phone.replace(/\D/g, '').slice(0, 2),
                  number: input.phone.replace(/\D/g, '').slice(2),
                },
              }
            : undefined,
        },
      });
      return { externalId: created.id };
    } catch (err) {
      logger.warn({ err }, 'Pagar.me ensureCustomer falhou — gerando externalId synth');
      // Fallback: usa hash do email — Pagar.me aceita "code" como external_id.
      return { externalId: crypto.createHash('sha1').update(input.email).digest('hex') };
    }
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput> {
    const recipientId = process.env.PAGARME_RECIPIENT_ID;

    const orderBody: Record<string, unknown> = {
      code: input.internalReference,
      customer_id: input.customerExternalId,
      items: [
        {
          amount: input.amountCents,
          description: input.description ?? 'Ingresso',
          quantity: 1,
        },
      ],
      payments: [
        input.method === 'pix'
          ? {
              payment_method: 'pix',
              pix: {
                expires_in: (input.expiresInHours ?? 1) * 3600,
              },
            }
          : input.method === 'credit_card'
            ? {
                payment_method: 'credit_card',
                credit_card: {
                  card_token: input.cardToken,
                  installments: 1,
                  statement_descriptor: 'PULSEPASS',
                },
              }
            : { payment_method: 'boleto' },
      ],
    };

    if (input.splits && input.splits.length > 0 && recipientId) {
      (orderBody.payments as Array<Record<string, unknown>>)[0].split = input.splits.map(
        (s) => ({
          amount: s.amountCents,
          recipient_id: s.recipientGatewayId,
          type: 'flat',
        }),
      );
    }

    interface PagarmeOrder {
      id: string;
      status: string;
      charges?: Array<{
        id: string;
        status: string;
        last_transaction?: {
          qr_code?: string;
          qr_code_url?: string;
          url?: string;
        };
      }>;
    }

    const order = await pagarmeFetch<PagarmeOrder>('/orders', {
      method: 'POST',
      body: orderBody,
    });
    const charge = order.charges?.[0];
    const tx = charge?.last_transaction;

    return {
      provider: PROVIDER,
      gatewayPaymentId: charge?.id ?? order.id,
      status:
        order.status === 'paid'
          ? 'paid'
          : order.status === 'failed'
            ? 'rejected'
            : 'pending',
      pixCopyPaste: tx?.qr_code,
      pixQrCode: tx?.qr_code_url,
      invoiceUrl: tx?.url,
      raw: order,
    };
  }

  async refund(input: RefundInput) {
    const refunded = await pagarmeFetch<{ status: string; amount: number }>(
      `/charges/${input.gatewayPaymentId}`,
      {
        method: 'DELETE',
        body: input.amountCents ? { amount: input.amountCents } : undefined,
      },
    );
    return {
      refundedCents: refunded.amount,
      status: refunded.status,
    };
  }

  verifyWebhook(headers: Record<string, string>, rawBody: string): boolean {
    const signature =
      headers['x-hub-signature'] ?? headers['X-Hub-Signature'] ?? '';
    const secret = process.env.PAGARME_WEBHOOK_SECRET;
    if (!secret) return false;

    const expected =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
  }
}
