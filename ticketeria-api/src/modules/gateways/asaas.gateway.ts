/**
 * Adapter Asaas que implementa PaymentGateway.
 * Encapsula chamadas existentes (não duplica lógica).
 *
 * Auditoria CTO 2026-05 — gap 4.6
 */
import crypto from 'crypto';
import { asaasFetch } from '../../config/asaas';
import { env } from '../../config/env';
import { asaasBreaker } from '../../shared/circuitBreaker';
import {
  PaymentGateway,
  CreateCustomerInput,
  CreatePaymentInput,
  CreatePaymentOutput,
  RefundInput,
  GatewayProvider,
} from './gateway.types';

const PROVIDER: GatewayProvider = 'asaas';

interface AsaasPaymentResponse {
  id: string;
  status: string;
  invoiceUrl?: string;
  encodedImage?: string; // pix
  payload?: string; // pix copy-paste
}

function mapBillingType(method: CreatePaymentInput['method']): string {
  switch (method) {
    case 'pix':
      return 'PIX';
    case 'credit_card':
      return 'CREDIT_CARD';
    case 'boleto':
      return 'BOLETO';
  }
}

function mapStatus(s: string): CreatePaymentOutput['status'] {
  if (s === 'CONFIRMED' || s === 'RECEIVED') return 'paid';
  if (s === 'PENDING' || s === 'AWAITING_RISK_ANALYSIS') return 'pending';
  if (s === 'REFUSED' || s === 'CHARGEBACK_REQUESTED') return 'rejected';
  return 'pending';
}

export class AsaasGateway implements PaymentGateway {
  readonly provider = PROVIDER;

  async healthCheck() {
    const start = Date.now();
    try {
      await asaasBreaker.exec(() => asaasFetch('/v3/finance/balance', { method: 'GET' }));
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
    const list = await asaasBreaker.exec(() =>
      asaasFetch<{ data: Array<{ id: string }> } | Array<{ id: string }>>(
        `/v3/customers?email=${encodeURIComponent(input.email)}`,
      ),
    );
    const existing = Array.isArray(list) ? list[0] : list?.data?.[0];
    if (existing?.id) return { externalId: existing.id };

    const created = await asaasBreaker.exec(() =>
      asaasFetch<{ id: string }>('/v3/customers', {
        method: 'POST',
        body: {
          name: input.name,
          email: input.email,
          cpfCnpj: cleaned,
          mobilePhone: input.phone,
        },
      }),
    );
    return { externalId: created.id };
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput> {
    const dueDate = new Date(Date.now() + (input.expiresInHours ?? 24) * 3600 * 1000)
      .toISOString()
      .slice(0, 10);

    const body: Record<string, unknown> = {
      customer: input.customerExternalId,
      billingType: mapBillingType(input.method),
      value: input.amountCents / 100,
      dueDate,
      description: input.description,
      externalReference: input.internalReference,
    };

    if (input.splits && input.splits.length > 0) {
      body.split = input.splits.map((s) => ({
        walletId: s.recipientGatewayId,
        fixedValue: s.amountCents / 100,
      }));
    }

    if (input.method === 'credit_card' && input.cardToken) {
      body.creditCardToken = input.cardToken;
    }

    const payment = await asaasBreaker.exec(() =>
      asaasFetch<AsaasPaymentResponse>('/v3/payments', { method: 'POST', body }),
    );

    let pixCopyPaste: string | undefined;
    let pixQrCode: string | undefined;
    if (input.method === 'pix') {
      const qr = await asaasBreaker.exec(() =>
        asaasFetch<{ encodedImage: string; payload: string }>(
          `/v3/payments/${payment.id}/pixQrCode`,
        ),
      );
      pixQrCode = qr.encodedImage;
      pixCopyPaste = qr.payload;
    }

    return {
      provider: PROVIDER,
      gatewayPaymentId: payment.id,
      status: mapStatus(payment.status),
      invoiceUrl: payment.invoiceUrl,
      pixCopyPaste,
      pixQrCode,
      raw: payment,
    };
  }

  async refund(input: RefundInput) {
    const result = await asaasBreaker.exec(() =>
      asaasFetch<{ status: string; value: number }>(
        `/v3/payments/${input.gatewayPaymentId}/refund`,
        {
          method: 'POST',
          body: input.amountCents ? { value: input.amountCents / 100 } : undefined,
        },
      ),
    );
    return {
      refundedCents: Math.round((result.value ?? 0) * 100),
      status: result.status,
    };
  }

  verifyWebhook(headers: Record<string, string>, rawBody: string): boolean {
    const signature =
      headers['asaas-access-token'] ?? headers['ASAAS-Access-Token'] ?? '';
    if (!env.ASAAS_WEBHOOK_SECRET) return false;
    // Asaas usa header de access token estático.
    const expected = env.ASAAS_WEBHOOK_SECRET;
    const ok = crypto.timingSafeEqual(
      Buffer.from(signature.padEnd(expected.length, '\0')),
      Buffer.from(expected.padEnd(signature.length, '\0')),
    );
    return ok && rawBody.length > 0;
  }
}
