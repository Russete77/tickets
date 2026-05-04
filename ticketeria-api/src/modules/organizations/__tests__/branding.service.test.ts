/**
 * Tests: BrandingService — white-label resolution + cache invalidation.
 * Auditoria CTO 2026-05 — gap 4.12
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const orgs = new Map<string, any>();
const cache = new Map<string, string>();

vi.mock('../../../config/database', () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(({ where, select }) => {
        const o = where.domain
          ? Array.from(orgs.values()).find((x) => x.domain === where.domain)
          : orgs.get(where.id);
        return Promise.resolve(o ?? null);
      }),
      update: vi.fn(({ where, data }) => {
        const o = orgs.get(where.id);
        if (!o) throw new Error('Not found');
        Object.assign(o, data);
        return Promise.resolve(o);
      }),
    },
  },
}));

vi.mock('../../../config/redis', () => ({
  redis: {
    get: vi.fn((key: string) => Promise.resolve(cache.get(key) ?? null)),
    setex: vi.fn((key: string, _ttl: number, value: string) => {
      cache.set(key, value);
      return Promise.resolve('OK');
    }),
    del: vi.fn((key: string) => {
      cache.delete(key);
      return Promise.resolve(1);
    }),
  },
}));

import { BrandingService } from '../branding.service';

describe('BrandingService.resolveByDomain', () => {
  beforeEach(() => {
    orgs.clear();
    cache.clear();
    vi.clearAllMocks();
  });

  it('retorna matched: false quando domínio não tem org', async () => {
    const result = await BrandingService.resolveByDomain('unknown.com');
    expect(result.matched).toBe(false);
  });

  it('cacheia respostas (não-match também)', async () => {
    await BrandingService.resolveByDomain('test.com');
    await BrandingService.resolveByDomain('test.com');
    // Segunda chamada veio do cache.
    expect(cache.has('branding:domain:test.com')).toBe(true);
  });

  it('normaliza host (lowercase + sem trailing slash)', async () => {
    orgs.set('o1', {
      id: 'o1',
      slug: 'vibe',
      name: 'Vibe',
      domain: 'vibe.com.br',
      branding: { primaryColor: '#FF0000' },
      defaultLocale: 'pt-BR',
      defaultCurrency: 'BRL',
    });
    const result = await BrandingService.resolveByDomain('Vibe.Com.Br/');
    expect(result.matched).toBe(true);
    expect(result.organizationId).toBe('o1');
  });
});

describe('BrandingService.toCssVars', () => {
  it('gera CSS vars válidas', () => {
    const css = BrandingService.toCssVars({
      primaryColor: '#FF3366',
      accentColor: '#00FFAA',
      fontFamily: 'Inter',
    });
    expect(css).toContain('--brand-primary: #FF3366');
    expect(css).toContain('--brand-accent: #00FFAA');
    expect(css).toContain('--brand-font: Inter');
  });

  it('lida com branding null', () => {
    expect(BrandingService.toCssVars(null)).toBe(':root{}');
  });
});
