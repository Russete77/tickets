/**
 * Tests: requireOrganizationRole middleware.
 * Auditoria CTO 2026-05 — gap 4.1
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const members = new Map<string, any>();

vi.mock('../../config/database', () => ({
  prisma: {
    organizationMember: {
      findUnique: vi.fn(({ where }) => {
        const key = `${where.organizationId_userId.organizationId}:${where.organizationId_userId.userId}`;
        return Promise.resolve(members.get(key) ?? null);
      }),
    },
  },
}));

import { requireOrganizationRole, requireOrganizationMember } from '../organization';

function mkReq(opts: { userId?: string; orgId?: string; role?: string }): Request {
  return {
    user: opts.userId ? { userId: opts.userId, email: 'a@b.com', role: opts.role ?? 'consumer' } : undefined,
    params: opts.orgId ? { organizationId: opts.orgId } : {},
    query: {},
    body: {},
  } as unknown as Request;
}

describe('requireOrganizationRole', () => {
  beforeEach(() => {
    members.clear();
  });

  it('rejeita request sem usuário autenticado', async () => {
    const next: NextFunction = vi.fn();
    await requireOrganizationRole('admin')(mkReq({}), {} as Response, next);
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.message).toMatch(/Não autenticado/);
  });

  it('rejeita request sem organizationId', async () => {
    const next: NextFunction = vi.fn();
    await requireOrganizationRole('admin')(
      mkReq({ userId: 'u1' }),
      {} as Response,
      next,
    );
    const err = (next as any).mock.calls[0][0];
    expect(err.message).toMatch(/organizationId/);
  });

  it('rejeita usuário não-membro', async () => {
    const next: NextFunction = vi.fn();
    await requireOrganizationRole('viewer')(
      mkReq({ userId: 'u1', orgId: 'o1' }),
      {} as Response,
      next,
    );
    const err = (next as any).mock.calls[0][0];
    expect(err.message).toMatch(/não é membro/);
  });

  it('rejeita membro com role abaixo do necessário', async () => {
    members.set('o1:u1', { role: 'viewer', acceptedAt: new Date() });
    const next: NextFunction = vi.fn();
    await requireOrganizationRole('admin')(
      mkReq({ userId: 'u1', orgId: 'o1' }),
      {} as Response,
      next,
    );
    const err = (next as any).mock.calls[0][0];
    expect(err.message).toMatch(/Role insuficiente/);
  });

  it('aceita membro com role suficiente', async () => {
    members.set('o1:u1', { role: 'owner', acceptedAt: new Date() });
    const next: NextFunction = vi.fn();
    const req = mkReq({ userId: 'u1', orgId: 'o1' });
    await requireOrganizationRole('admin')(req, {} as Response, next);
    expect((next as any).mock.calls[0][0]).toBeUndefined();
    expect(req.organizationId).toBe('o1');
    expect(req.organizationRole).toBe('owner');
  });

  it('admin global da plataforma sempre passa', async () => {
    const next: NextFunction = vi.fn();
    const req = mkReq({ userId: 'u1', orgId: 'o1', role: 'admin' });
    await requireOrganizationRole('owner')(req, {} as Response, next);
    expect((next as any).mock.calls[0][0]).toBeUndefined();
    expect(req.organizationRole).toBe('owner');
  });

  it('rejeita convite pendente (acceptedAt null)', async () => {
    members.set('o1:u1', { role: 'admin', acceptedAt: null });
    const next: NextFunction = vi.fn();
    await requireOrganizationRole('admin')(
      mkReq({ userId: 'u1', orgId: 'o1' }),
      {} as Response,
      next,
    );
    const err = (next as any).mock.calls[0][0];
    expect(err.message).toMatch(/não é membro/);
  });
});

describe('requireOrganizationMember', () => {
  beforeEach(() => {
    members.clear();
  });

  it('aceita qualquer role aceito', async () => {
    members.set('o1:u1', { role: 'viewer', acceptedAt: new Date() });
    const next: NextFunction = vi.fn();
    await requireOrganizationMember()(
      mkReq({ userId: 'u1', orgId: 'o1' }),
      {} as Response,
      next,
    );
    expect((next as any).mock.calls[0][0]).toBeUndefined();
  });
});
