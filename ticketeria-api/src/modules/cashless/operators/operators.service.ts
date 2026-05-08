import bcrypt from 'bcryptjs';
import { prisma } from '../../../config/database';
import { logAudit, AuditActions } from '../../../shared/audit';
import { ConflictError } from '../../../shared/errors';
import { assertPosBelongsToOrg, assertOperatorBelongsToOrg } from '../shared/orgScope';
import { emitCatalogUpdated } from '../shared/catalogEvents';

interface CreateInput {
  organizationId: string;
  posId: string;
  actorId: string;
  data: { name?: string; cpf?: string; userId?: string; pin: string; isActive: boolean };
}

interface UpdateInput {
  organizationId: string;
  operatorId: string;
  actorId: string;
  data: Partial<{ name: string; cpf: string; isActive: boolean }>;
}

interface ResetPinInput {
  organizationId: string;
  operatorId: string;
  actorId: string;
  newPin: string;
}

const BCRYPT_ROUNDS = 10;

async function assertPinUniqueInPos(posId: string, pin: string, ignoreOperatorId?: string) {
  const ops = await prisma.pOSOperator.findMany({
    where: { posId, isArchived: false },
  });
  for (const op of ops) {
    if (ignoreOperatorId && op.id === ignoreOperatorId) continue;
    if (op.pinHash && (await bcrypt.compare(pin, op.pinHash))) {
      throw new ConflictError('PIN já usado por outro operador neste POS');
    }
  }
}

export class OperatorsService {
  static async list({ organizationId, posId }: { organizationId: string; posId: string }) {
    await assertPosBelongsToOrg(posId, organizationId);
    return prisma.pOSOperator.findMany({
      where: { posId, isArchived: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, posId: true, userId: true, name: true, cpf: true,
        isActive: true, isArchived: true, createdAt: true,
      },
    });
  }

  static async create({ organizationId, posId, actorId, data }: CreateInput) {
    await assertPosBelongsToOrg(posId, organizationId);
    await assertPinUniqueInPos(posId, data.pin);

    const pinHash = await bcrypt.hash(data.pin, BCRYPT_ROUNDS);
    const op = await prisma.pOSOperator.create({
      data: {
        posId,
        userId: data.userId,
        name: data.name,
        cpf: data.cpf,
        pin: data.pin.padEnd(6, '0').slice(0, 6),
        pinHash,
        isActive: data.isActive,
      },
    });
    await emitCatalogUpdated(posId);
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_OPERATOR_CREATED,
      entityType: 'pos_operator',
      entityId: op.id,
      metadata: { posId, name: data.name, hasUserId: !!data.userId },
    });
    return op;
  }

  static async update({ organizationId, operatorId, actorId, data }: UpdateInput) {
    const existing = await assertOperatorBelongsToOrg(operatorId, organizationId);
    const updated = await prisma.pOSOperator.update({
      where: { id: operatorId },
      data,
    });
    await emitCatalogUpdated(existing.posId);
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_OPERATOR_UPDATED,
      entityType: 'pos_operator',
      entityId: operatorId,
      metadata: data,
    });
    return updated;
  }

  static async resetPin({ organizationId, operatorId, actorId, newPin }: ResetPinInput) {
    const existing = await assertOperatorBelongsToOrg(operatorId, organizationId);
    await assertPinUniqueInPos(existing.posId, newPin, operatorId);

    const pinHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);
    const updated = await prisma.pOSOperator.update({
      where: { id: operatorId },
      data: { pinHash, pin: newPin.padEnd(6, '0').slice(0, 6) },
    });
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_OPERATOR_PIN_RESET,
      entityType: 'pos_operator',
      entityId: operatorId,
    });
    return updated;
  }

  static async archive({
    organizationId,
    operatorId,
    actorId,
  }: {
    organizationId: string;
    operatorId: string;
    actorId: string;
  }) {
    const existing = await assertOperatorBelongsToOrg(operatorId, organizationId);
    const archived = await prisma.pOSOperator.update({
      where: { id: operatorId },
      data: { isArchived: true, archivedAt: new Date(), isActive: false },
    });
    await emitCatalogUpdated(existing.posId);
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_OPERATOR_ARCHIVED,
      entityType: 'pos_operator',
      entityId: operatorId,
    });
    return archived;
  }
}
