/**
 * Tests: OrganizationsService
 * Auditoria CTO 2026-05 — gap 4.1
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationsService } from '../organizations.service';

vi.mock('../../../config/database', () => {
  const orgs = new Map<string, any>();
  const members = new Map<string, any>();
  const users = new Map<string, any>();
  return {
    prisma: {
      organization: {
        create: vi.fn(({ data }) => {
          const id = `org-${orgs.size + 1}`;
          const o = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          orgs.set(id, o);
          return Promise.resolve(o);
        }),
        findUnique: vi.fn(({ where }) => {
          if (where.id) return Promise.resolve(orgs.get(where.id) ?? null);
          if (where.slug) {
            for (const o of orgs.values()) if (o.slug === where.slug) return Promise.resolve(o);
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }),
        findFirst: vi.fn(({ where }) => {
          for (const o of orgs.values()) {
            if (where.legacyProducerId && o.legacyProducerId === where.legacyProducerId) {
              return Promise.resolve(o);
            }
          }
          return Promise.resolve(null);
        }),
      },
      organizationMember: {
        create: vi.fn(({ data }) => {
          const key = `${data.organizationId}:${data.userId}`;
          const m = { ...data, createdAt: new Date() };
          members.set(key, m);
          return Promise.resolve(m);
        }),
        findUnique: vi.fn(({ where }) => {
          const key = `${where.organizationId_userId.organizationId}:${where.organizationId_userId.userId}`;
          return Promise.resolve(members.get(key) ?? null);
        }),
        findMany: vi.fn(() => Promise.resolve(Array.from(members.values()))),
        update: vi.fn(({ where, data }) => {
          const key = `${where.organizationId_userId.organizationId}:${where.organizationId_userId.userId}`;
          const cur = members.get(key);
          if (!cur) throw new Error('Not found');
          const updated = { ...cur, ...data };
          members.set(key, updated);
          return Promise.resolve(updated);
        }),
        delete: vi.fn(({ where }) => {
          const key = `${where.organizationId_userId.organizationId}:${where.organizationId_userId.userId}`;
          members.delete(key);
          return Promise.resolve({});
        }),
      },
      user: {
        findUnique: vi.fn(({ where }) => {
          if (where.email === 'invitee@test.com') {
            return Promise.resolve({ id: 'user-invitee', email: where.email });
          }
          return Promise.resolve(null);
        }),
      },
      $transaction: vi.fn(async (fn) => fn({
        organization: {
          create: vi.fn(({ data }) => {
            const id = `org-${orgs.size + 1}`;
            const o = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
            orgs.set(id, o);
            return Promise.resolve(o);
          }),
        },
        organizationMember: {
          create: vi.fn(({ data }) => {
            const key = `${data.organizationId}:${data.userId}`;
            const m = { ...data, createdAt: new Date() };
            members.set(key, m);
            return Promise.resolve(m);
          }),
        },
      })),
    },
  };
});

vi.mock('../../../shared/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
  AuditActions: { organizationCreated: 'organization.created' },
}));

describe('OrganizationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria organização e adiciona criador como owner', async () => {
    const org = await OrganizationsService.create('user-1', { name: 'Vibe SP' });
    expect(org).toMatchObject({ name: 'Vibe SP', type: 'producer' });
    expect(org.slug).toBe('vibe-sp');
  });

  it('garante slug único quando nome se repete', async () => {
    await OrganizationsService.create('user-1', { name: 'Vibe SP' });
    const second = await OrganizationsService.create('user-2', { name: 'Vibe SP' });
    expect(second.slug).toMatch(/^vibe-sp-\d+$/);
  });

  it('rejeita nome inválido para slug', async () => {
    await expect(
      OrganizationsService.create('user-1', { name: '   ' }),
    ).rejects.toThrow(/slug/i);
  });

  it('inviteMember exige usuário pré-existente', async () => {
    const org = await OrganizationsService.create('user-1', { name: 'Festival SP' });
    await expect(
      OrganizationsService.inviteMember({
        organizationId: org.id,
        email: 'desconhecido@test.com',
        role: 'admin',
        invitedBy: 'user-1',
      }),
    ).rejects.toThrow(/usuário não encontrado/i);
  });

  it('inviteMember cria membro pendente quando usuário existe', async () => {
    const org = await OrganizationsService.create('user-1', { name: 'Festival RJ' });
    const member = await OrganizationsService.inviteMember({
      organizationId: org.id,
      email: 'invitee@test.com',
      role: 'admin',
      invitedBy: 'user-1',
    });
    expect(member.role).toBe('admin');
    expect(member.acceptedAt).toBeFalsy();
  });
});
