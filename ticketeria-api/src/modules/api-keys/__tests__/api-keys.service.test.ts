/**
 * Tests: ApiKeysService
 * Auditoria CTO 2026-05 — gap 4.10
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiKeys = new Map<string, any>();

vi.mock('../../../config/database', () => ({
  prisma: {
    apiKey: {
      create: vi.fn(({ data }) => {
        const id = `key-${apiKeys.size + 1}`;
        const k = { id, ...data, createdAt: new Date() };
        apiKeys.set(id, k);
        return Promise.resolve(k);
      }),
      findUnique: vi.fn(({ where }) => {
        if (where.id) return Promise.resolve(apiKeys.get(where.id) ?? null);
        for (const k of apiKeys.values()) {
          if (where.prefix && k.prefix === where.prefix) return Promise.resolve(k);
        }
        return Promise.resolve(null);
      }),
      update: vi.fn(({ where, data }) => {
        const k = apiKeys.get(where.id);
        if (!k) throw new Error('Not found');
        Object.assign(k, data);
        return Promise.resolve(k);
      }),
      findMany: vi.fn(() => Promise.resolve(Array.from(apiKeys.values()))),
    },
  },
}));

vi.mock('../../../shared/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

import { ApiKeysService } from '../api-keys.service';

describe('ApiKeysService', () => {
  beforeEach(() => {
    apiKeys.clear();
  });

  it('cria api key com prefixo pk_ e secret token retornado uma vez', async () => {
    const result = await ApiKeysService.create('org-1', 'user-1', {
      name: 'Webhook integration',
      scopes: ['orders:read'],
    });
    expect(result.prefix.startsWith('pk_')).toBe(true);
    expect(result.secretToken.startsWith(`${result.prefix}.`)).toBe(true);
    expect(result.secretToken.length).toBeGreaterThan(50);
  });

  it('autentica token válido', async () => {
    const created = await ApiKeysService.create('org-99', 'user-1', {
      name: 'Test',
      scopes: ['events:read'],
    });
    const auth = await ApiKeysService.authenticate(created.secretToken);
    expect(auth.organizationId).toBe('org-99');
    expect(auth.scopes).toEqual(['events:read']);
  });

  it('rejeita token revogado', async () => {
    const created = await ApiKeysService.create('org-x', 'user-1', {
      name: 'Test',
      scopes: [],
    });
    await ApiKeysService.revoke(created.id, 'org-x', 'user-1');
    await expect(ApiKeysService.authenticate(created.secretToken)).rejects.toThrow(
      /revogado/i,
    );
  });

  it('rejeita token mal-formado', async () => {
    await expect(ApiKeysService.authenticate('garbage')).rejects.toThrow();
    await expect(ApiKeysService.authenticate('pk_only')).rejects.toThrow();
  });
});
