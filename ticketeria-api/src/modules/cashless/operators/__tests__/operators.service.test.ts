import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { OperatorsService } from '../operators.service';

const events = new Map([['event-1', { id: 'event-1', organizationId: 'org-1' }]]);
const pos = new Map([['pos-1', { id: 'pos-1', eventId: 'event-1' }]]);
const ops = new Map<string, any>();

vi.mock('../../../../config/database', () => ({
  prisma: {
    pointOfSale: {
      findUnique: vi.fn(({ where, include }) => {
        const p = pos.get(where.id);
        if (!p) return Promise.resolve(null);
        if (include?.event) return Promise.resolve({ ...p, event: events.get(p.eventId) });
        return Promise.resolve(p);
      }),
    },
    pOSOperator: {
      create: vi.fn(({ data }) => {
        const id = `op-${ops.size + 1}`;
        const o = { id, isArchived: false, isActive: true, createdAt: new Date(), ...data };
        ops.set(id, o);
        return Promise.resolve(o);
      }),
      findUnique: vi.fn(({ where, include }) => {
        const o = ops.get(where.id);
        if (!o) return Promise.resolve(null);
        if (include?.pos) {
          const posObj = pos.get(o.posId);
          return Promise.resolve({
            ...o,
            pos: { ...posObj, event: events.get(posObj!.eventId) },
          });
        }
        return Promise.resolve(o);
      }),
      findMany: vi.fn(({ where }) =>
        Promise.resolve(
          Array.from(ops.values()).filter(
            (o) => o.posId === where.posId && (where.isArchived === false ? !o.isArchived : true),
          ),
        ),
      ),
      update: vi.fn(({ where, data }) => {
        const o = ops.get(where.id);
        Object.assign(o, data);
        return Promise.resolve(o);
      }),
    },
  },
}));

vi.mock('../../../../shared/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
  AuditActions: {
    CASHLESS_OPERATOR_CREATED: 'cashless.operator_created',
    CASHLESS_OPERATOR_UPDATED: 'cashless.operator_updated',
    CASHLESS_OPERATOR_PIN_RESET: 'cashless.operator_pin_reset',
    CASHLESS_OPERATOR_ARCHIVED: 'cashless.operator_archived',
  },
}));

vi.mock('../../shared/catalogEvents', () => ({
  emitCatalogUpdated: vi.fn(() => Promise.resolve()),
}));

describe('OperatorsService', () => {
  beforeEach(() => {
    ops.clear();
    vi.clearAllMocks();
  });

  it('cria operador leve com nome + bcrypt PIN', async () => {
    const op = await OperatorsService.create({
      organizationId: 'org-1',
      posId: 'pos-1',
      actorId: 'u1',
      data: { name: 'João Bartender', pin: '1234', isActive: true },
    });
    expect(op.name).toBe('João Bartender');
    expect(op.pinHash).not.toBe('1234');
    expect(await bcrypt.compare('1234', op.pinHash!)).toBe(true);
  });

  it('rejeita PIN duplicado dentro do mesmo POS', async () => {
    await OperatorsService.create({
      organizationId: 'org-1',
      posId: 'pos-1',
      actorId: 'u1',
      data: { name: 'A', pin: '1234', isActive: true },
    });
    await expect(
      OperatorsService.create({
        organizationId: 'org-1',
        posId: 'pos-1',
        actorId: 'u1',
        data: { name: 'B', pin: '1234', isActive: true },
      }),
    ).rejects.toThrow(/PIN/i);
  });

  it('reset-pin troca pinHash, mantém demais campos', async () => {
    const op = await OperatorsService.create({
      organizationId: 'org-1',
      posId: 'pos-1',
      actorId: 'u1',
      data: { name: 'C', pin: '1111', isActive: true },
    });
    const updated = await OperatorsService.resetPin({
      organizationId: 'org-1',
      operatorId: op.id,
      actorId: 'u1',
      newPin: '9999',
    });
    expect(await bcrypt.compare('9999', updated.pinHash!)).toBe(true);
    expect(await bcrypt.compare('1111', updated.pinHash!)).toBe(false);
  });
});
