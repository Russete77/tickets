/**
 * API keys públicas (OAuth-lite client credentials).
 *
 * Formato exposto ao cliente: `pk_live_<prefix>.<secret>`.
 * `prefix` (12 chars) é salvo plain — usado para lookup rápido.
 * `<secret>` é hashed com bcrypt e nunca persistido em claro.
 *
 * Auditoria CTO 2026-05 — gap 4.10
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { logAudit } from '../../shared/audit';
import { ForbiddenError, NotFoundError } from '../../shared/errors';

export const ALL_SCOPES = [
  'events:read',
  'events:write',
  'orders:read',
  'tickets:read',
  'checkin:write',
  'cashless:read',
  'reports:read',
  'webhooks:write',
] as const;

export type ApiScope = (typeof ALL_SCOPES)[number];

export class ApiKeysService {
  /**
   * Cria api key. Retorna o `secretToken` em claro APENAS UMA VEZ.
   */
  static async create(
    organizationId: string,
    actorId: string,
    args: { name: string; scopes: ApiScope[]; expiresAt?: Date },
  ): Promise<{ id: string; prefix: string; secretToken: string }> {
    const prefix = 'pk_' + crypto.randomBytes(4).toString('hex'); // 12 chars total
    const secret = crypto.randomBytes(32).toString('hex');
    const hashedKey = await bcrypt.hash(secret, 10);

    const key = await prisma.apiKey.create({
      data: {
        organizationId,
        name: args.name,
        prefix,
        hashedKey,
        scopes: args.scopes,
        expiresAt: args.expiresAt,
      },
    });

    await logAudit({
      actorId,
      action: 'api_key.created',
      entityType: 'api_key',
      entityId: key.id,
      metadata: { scopes: args.scopes },
    });

    return {
      id: key.id,
      prefix: key.prefix,
      secretToken: `${prefix}.${secret}`,
    };
  }

  /**
   * Valida token recebido (formato `prefix.secret`).
   * Usa lookup por prefix (índice único) e bcrypt.compare.
   */
  static async authenticate(token: string): Promise<{
    organizationId: string;
    keyId: string;
    scopes: string[];
  }> {
    const [prefix, secret] = token.split('.');
    if (!prefix || !secret) throw new ForbiddenError('Token inválido');

    const key = await prisma.apiKey.findUnique({ where: { prefix } });
    if (!key || key.revokedAt) throw new ForbiddenError('Token revogado');
    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new ForbiddenError('Token expirado');
    }

    const ok = await bcrypt.compare(secret, key.hashedKey);
    if (!ok) throw new ForbiddenError('Token inválido');

    // Atualiza lastUsedAt (não-bloqueante).
    prisma.apiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return { organizationId: key.organizationId, keyId: key.id, scopes: key.scopes };
  }

  static async revoke(keyId: string, organizationId: string, actorId: string) {
    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key || key.organizationId !== organizationId) throw new NotFoundError();
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
    await logAudit({
      actorId,
      action: 'api_key.revoked',
      entityType: 'api_key',
      entityId: keyId,
    });
  }

  static async list(organizationId: string) {
    return prisma.apiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        revokedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }
}
