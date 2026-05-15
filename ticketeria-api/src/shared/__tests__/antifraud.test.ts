import { describe, it, expect } from 'vitest';
import { computeRiskScore, type RiskSignals } from '../antifraud';

const clean: RiskSignals = {
  totalQuantity: 1,
  distinctCpfsOnDevice: 1,
  refundedOrdersCount: 0,
  recentOrdersSameCpf: 1,
  deviceVelocityCount: 1,
  purchaseSpeedMs: 8000,
};

describe('computeRiskScore', () => {
  it('aprova compra limpa com score 0', () => {
    const r = computeRiskScore(clean);
    expect(r.score).toBe(0);
    expect(r.status).toBe('approve');
    expect(r.reasons).toEqual([]);
  });

  it('soma +20 para quantidade > 4', () => {
    const r = computeRiskScore({ ...clean, totalQuantity: 5 });
    expect(r.score).toBe(20);
    expect(r.status).toBe('approve');
  });

  it('entra em review com score >= 40 (refunds)', () => {
    const r = computeRiskScore({ ...clean, refundedOrdersCount: 3 });
    expect(r.score).toBe(40);
    expect(r.status).toBe('review');
  });

  it('bloqueia com score > 70 (multi-CPF + velocidade)', () => {
    const r = computeRiskScore({
      ...clean,
      distinctCpfsOnDevice: 3, // +50
      deviceVelocityCount: 6, // +25
    });
    expect(r.score).toBe(75);
    expect(r.status).toBe('block');
  });

  it('detecta bot por compra <1s (+40)', () => {
    const r = computeRiskScore({ ...clean, purchaseSpeedMs: 500 });
    expect(r.score).toBe(40);
    expect(r.reasons).toContain('Compra concluída em menos de 1s (provável bot)');
  });

  it('ignora purchaseSpeed quando null', () => {
    const r = computeRiskScore({ ...clean, purchaseSpeedMs: null });
    expect(r.score).toBe(0);
  });

  it('acumula múltiplas regras e bloqueia', () => {
    const r = computeRiskScore({
      totalQuantity: 5, // +20
      distinctCpfsOnDevice: 3, // +50
      refundedOrdersCount: 0,
      recentOrdersSameCpf: 3, // +30
      deviceVelocityCount: 1,
      purchaseSpeedMs: 5000,
    });
    expect(r.score).toBe(100);
    expect(r.status).toBe('block');
  });
});
