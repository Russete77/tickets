/**
 * Tests: WebhookOutboundService.attemptDelivery — retry e classificação de erros.
 * Auditoria CTO 2026-05 — gap 4.10
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const deliveries = new Map<string, any>();

vi.mock('../../../config/database', () => ({
  prisma: {
    webhookDelivery: {
      findUnique: vi.fn(({ where }) => Promise.resolve(deliveries.get(where.id) ?? null)),
      update: vi.fn(({ where, data }) => {
        const cur = deliveries.get(where.id);
        if (!cur) throw new Error('Not found');
        Object.assign(cur, data);
        return Promise.resolve(cur);
      }),
      create: vi.fn(({ data }) => {
        const id = `del-${deliveries.size + 1}`;
        const d = { id, ...data, attempts: 0 };
        deliveries.set(id, d);
        return Promise.resolve(d);
      }),
    },
    webhookSubscription: {
      findMany: vi.fn(() => Promise.resolve([])),
    },
  },
}));

vi.mock('../../../jobs/queue', () => ({
  webhookOutboundQueue: { add: vi.fn(() => Promise.resolve()) },
}));

vi.mock('../../../shared/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const fetchMock = vi.fn();
global.fetch = fetchMock as any;

import { WebhookOutboundService } from '../webhook-outbound.service';

describe('WebhookOutboundService.attemptDelivery', () => {
  beforeEach(() => {
    deliveries.clear();
    fetchMock.mockReset();
    deliveries.set('d1', {
      id: 'd1',
      eventType: 'order_paid',
      payload: { ok: true },
      status: 'pending',
      attempts: 0,
      subscription: { id: 's1', url: 'https://hook.test', secret: 'shh' },
    });
  });

  it('marca delivered quando endpoint retorna 200', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const result = await WebhookOutboundService.attemptDelivery('d1');
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(deliveries.get('d1').status).toBe('delivered');
    expect(deliveries.get('d1').deliveredAt).toBeInstanceOf(Date);
  });

  it('marca failed quando endpoint retorna 500 (continua tentando)', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    const result = await WebhookOutboundService.attemptDelivery('d1');
    expect(result.ok).toBe(false);
    expect(deliveries.get('d1').status).toBe('failed');
    expect(deliveries.get('d1').attempts).toBe(1);
  });

  it('marca abandoned após 8 tentativas', async () => {
    deliveries.get('d1').attempts = 7;
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    await WebhookOutboundService.attemptDelivery('d1');
    expect(deliveries.get('d1').status).toBe('abandoned');
  });

  it('inclui assinatura HMAC no header', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await WebhookOutboundService.attemptDelivery('d1');
    const callArgs = fetchMock.mock.calls[0];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers['X-PulsePass-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(headers['X-PulsePass-Event']).toBe('order_paid');
    expect(headers['X-PulsePass-Delivery']).toBe('d1');
  });

  it('skipa delivery já entregue (idempotência)', async () => {
    deliveries.get('d1').status = 'delivered';
    const result = await WebhookOutboundService.attemptDelivery('d1');
    expect(result.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
