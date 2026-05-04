/**
 * Tests: GatewayRegistry — fallback automático
 * Auditoria CTO 2026-05 — gap 4.6
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../shared/metrics', () => ({
  paymentFailoverCounter: { inc: vi.fn() },
}));
vi.mock('../../../shared/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { GatewayRegistry } from '../gateway.registry';
import { PaymentGateway } from '../gateway.types';

class MockGateway implements PaymentGateway {
  constructor(
    public readonly provider: any,
    private fail = false,
  ) {}
  async healthCheck() {
    return { healthy: !this.fail, latencyMs: 5 };
  }
  async ensureCustomer() {
    return { externalId: `${this.provider}-cust` };
  }
  async createPayment(input: any) {
    if (this.fail) throw new Error('Gateway down');
    return {
      provider: this.provider,
      gatewayPaymentId: `${this.provider}-pay`,
      status: 'pending' as const,
      raw: input,
    };
  }
  async refund() {
    return { refundedCents: 0, status: 'ok' };
  }
  verifyWebhook() {
    return true;
  }
}

describe('GatewayRegistry', () => {
  it('usa primary quando saudável', async () => {
    const reg = new GatewayRegistry();
    const primary = new MockGateway('asaas');
    const secondary = new MockGateway('pagarme');
    reg.register(primary);
    reg.register(secondary);
    const result = await reg.createPaymentWithFailover({
      customerExternalId: 'c1',
      internalReference: 'ref-1',
      amountCents: 1000,
      method: 'pix',
    });
    expect(result.provider).toBe('asaas');
  });

  it('faz failover para secondary quando primary lança', async () => {
    const reg = new GatewayRegistry();
    const primary = new MockGateway('asaas', true);
    const secondary = new MockGateway('pagarme');
    reg.register(primary);
    reg.register(secondary);
    const result = await reg.createPaymentWithFailover({
      customerExternalId: 'c1',
      internalReference: 'ref-2',
      amountCents: 2000,
      method: 'credit_card',
    });
    expect(result.provider).toBe('pagarme');
  });

  it('propaga erro se ambos falharem', async () => {
    const reg = new GatewayRegistry();
    reg.register(new MockGateway('asaas', true));
    reg.register(new MockGateway('pagarme', true));
    await expect(
      reg.createPaymentWithFailover({
        customerExternalId: 'c1',
        internalReference: 'ref-3',
        amountCents: 3000,
        method: 'pix',
      }),
    ).rejects.toThrow();
  });
});
