/**
 * Tests: WebhookOutboundService
 * Auditoria CTO 2026-05 — gap 4.10
 */
import { describe, it, expect } from 'vitest';
import { WebhookOutboundService } from '../webhook-outbound.service';

describe('WebhookOutboundService.sign', () => {
  it('assina determinístico com mesmo secret/payload', () => {
    const sig1 = WebhookOutboundService.sign('secret-x', '{"a":1}');
    const sig2 = WebhookOutboundService.sign('secret-x', '{"a":1}');
    expect(sig1).toBe(sig2);
    expect(sig1.startsWith('sha256=')).toBe(true);
  });

  it('produz assinatura diferente quando secret muda', () => {
    const sig1 = WebhookOutboundService.sign('secret-a', '{"a":1}');
    const sig2 = WebhookOutboundService.sign('secret-b', '{"a":1}');
    expect(sig1).not.toBe(sig2);
  });

  it('produz assinatura diferente quando payload muda', () => {
    const sig1 = WebhookOutboundService.sign('secret-a', '{"a":1}');
    const sig2 = WebhookOutboundService.sign('secret-a', '{"a":2}');
    expect(sig1).not.toBe(sig2);
  });
});
