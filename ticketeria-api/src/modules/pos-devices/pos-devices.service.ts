import crypto from 'crypto';
import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, UnauthorizedError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';

const PAIR_CODE_TTL_MS = 10 * 60 * 1000;
const PAIR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0/I/1

function genPairCode(): string {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += PAIR_ALPHABET[bytes[i] % PAIR_ALPHABET.length];
  return out;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class PosDeviceService {
  static async issuePairCode(input: {
    posId: string; organizationId: string; label: string; actorId: string;
  }): Promise<{ deviceId: string; pairingCode: string; expiresAt: Date }> {
    const pairingCode = genPairCode();
    const expiresAt = new Date(Date.now() + PAIR_CODE_TTL_MS);

    const device = await prisma.posDevice.create({
      data: {
        posId: input.posId,
        organizationId: input.organizationId,
        label: input.label,
        pairingCode,
        pairingCodeExpiresAt: expiresAt,
        status: 'pending',
        createdBy: input.actorId,
      },
    });

    await logAudit({
      actorId: input.actorId,
      action: AuditActions.POS_DEVICE_PAIR_CODE_ISSUED,
      entityType: 'pos_device',
      entityId: device.id,
      metadata: { posId: input.posId },
    });

    return { deviceId: device.id, pairingCode, expiresAt };
  }

  static async redeem(
    pairingCode: string,
    context?: { ipAddress?: string },
  ): Promise<{ deviceToken: string; posId: string }> {
    const device = await prisma.posDevice.findUnique({ where: { pairingCode } });
    if (!device) throw new NotFoundError('Código de pareamento inválido');
    if (device.status === 'revoked') throw new BadRequestError('Dispositivo revogado');
    if (!device.pairingCodeExpiresAt || device.pairingCodeExpiresAt < new Date()) {
      throw new BadRequestError('Código de pareamento expirado');
    }

    const deviceToken = `pd_${crypto.randomBytes(32).toString('base64url')}`;

    await prisma.posDevice.update({
      where: { id: device.id },
      data: {
        deviceTokenHash: hashToken(deviceToken),
        tokenPrefix: deviceToken.slice(0, 12),
        status: 'active',
        pairingCode: null,
        pairingCodeExpiresAt: null,
        pairedAt: new Date(),
        lastIp: context?.ipAddress ?? null,
      },
    });

    await logAudit({
      actorId: device.createdBy,
      action: AuditActions.POS_DEVICE_PAIRED,
      entityType: 'pos_device',
      entityId: device.id,
      metadata: { posId: device.posId },
      ipAddress: context?.ipAddress,
    });

    return { deviceToken, posId: device.posId };
  }

  static async authenticateByToken(
    deviceToken: string,
  ): Promise<{ id: string; posId: string; organizationId: string }> {
    const device = await prisma.posDevice.findFirst({
      where: { deviceTokenHash: hashToken(deviceToken), status: 'active' },
      select: { id: true, posId: true, organizationId: true },
    });
    if (!device) throw new UnauthorizedError('Dispositivo não autorizado');
    return device;
  }

  static async revoke(input: {
    posId: string; organizationId: string; deviceId: string; actorId: string;
  }): Promise<void> {
    const device = await prisma.posDevice.findFirst({
      where: { id: input.deviceId, posId: input.posId, organizationId: input.organizationId },
    });
    if (!device) throw new NotFoundError('Dispositivo não encontrado');

    await prisma.posDevice.update({
      where: { id: input.deviceId },
      data: { status: 'revoked', revokedAt: new Date(), revokedBy: input.actorId },
    });

    await logAudit({
      actorId: input.actorId,
      action: AuditActions.POS_DEVICE_REVOKED,
      entityType: 'pos_device',
      entityId: input.deviceId,
      metadata: { posId: input.posId },
    });
  }

  static async heartbeat(
    deviceId: string,
    data: { appVersion?: string; online?: boolean; pendingQueue?: number; battery?: number },
    ipAddress?: string,
  ): Promise<void> {
    await prisma.posDevice.update({
      where: { id: deviceId },
      data: {
        lastSeenAt: new Date(),
        appVersion: data.appVersion ?? undefined,
        lastIp: ipAddress ?? undefined,
      },
    });
  }

  static async listByPos(posId: string, organizationId: string) {
    return prisma.posDevice.findMany({
      where: { posId, organizationId },
      select: {
        id: true, label: true, status: true, lastSeenAt: true,
        appVersion: true, pairedAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
