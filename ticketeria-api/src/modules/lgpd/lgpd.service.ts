import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { prisma } from '../../config/database';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { logger } from '../../shared/logger';

/**
 * LGPD — exportação e anonimização de dados pessoais.
 *
 * Anonimização NÃO deleta linhas (mantém integridade referencial de
 * pedidos/ingressos/ledger): substitui PII por marcadores [REDACTED-...]
 * e invalida o passwordHash (bloqueia login). Auditável e irreversível.
 */
export class LgpdService {
  /**
   * Coleta todos os dados pessoais do usuário para export (LGPD art. 18, II/V).
   * Retornado como objeto — o worker serializa em ZIP.
   */
  static async collectUserData(userId: string): Promise<{
    profile: unknown;
    tickets: unknown[];
    orders: unknown[];
    transactions: unknown[];
    auditTrail: unknown[];
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        cpf: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        emailVerified: true,
        totpEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const [tickets, orders, auditTrail] = await Promise.all([
      prisma.ticket.findMany({
        where: { holderId: userId },
        select: {
          id: true,
          eventId: true,
          status: true,
          holderName: true,
          holderCpf: true,
          holderEmail: true,
          priceCents: true,
          checkedInAt: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: { userId },
        select: {
          id: true,
          eventId: true,
          status: true,
          totalCents: true,
          paymentMethod: true,
          createdAt: true,
          paidAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { actorId: userId },
        select: {
          action: true,
          entityType: true,
          entityId: true,
          ipAddress: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    ]);

    const wallets = await prisma.cashlessWallet.findMany({
      where: { userId },
      select: { id: true },
    });
    const walletIds = wallets.map((w) => w.id);

    const transactions = walletIds.length
      ? await prisma.cashlessTransaction.findMany({
          where: { walletId: { in: walletIds } },
          select: {
            id: true,
            type: true,
            status: true,
            amountCents: true,
            balanceAfter: true,
            createdAt: true,
          },
        })
      : [];

    return { profile: user, tickets, orders, transactions, auditTrail };
  }

  /**
   * Anonimiza a conta do usuário. Exige reautenticação (senha) e,
   * se 2FA ativo, o código TOTP. Idempotente: já-anonimizado lança erro.
   */
  static async anonymizeUser(
    userId: string,
    password: string,
    totpCode: string | undefined,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ anonymized: true; userId: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    if (user.email.startsWith('redacted+')) {
      throw new BadRequestError('Conta já foi anonimizada');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      await logAudit({
        actorId: userId,
        action: AuditActions.USER_LOGIN_FAILED,
        entityType: 'user',
        entityId: userId,
        metadata: { reason: 'lgpd_anonymize_bad_password' },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });
      throw new UnauthorizedError('Senha incorreta');
    }

    if (user.totpEnabled && user.totpSecret) {
      if (!totpCode) {
        throw new BadRequestError('Código 2FA é obrigatório para esta conta');
      }
      if (!authenticator.check(totpCode, user.totpSecret)) {
        throw new UnauthorizedError('Código 2FA inválido');
      }
    }

    const tag = `[REDACTED-${userId.slice(0, 8)}]`;

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `redacted+${userId}@anonymized.local`,
        cpf: `RDCT${userId.slice(0, 10)}`,
        name: tag,
        phone: null,
        avatarUrl: null,
        // Invalida login: hash de valor aleatório não recuperável
        passwordHash: await bcrypt.hash(`anon-${userId}-${Date.now()}`, 10),
        totpSecret: null,
        totpEnabled: false,
        expoPushToken: null,
        deviceFingerprints: [],
      },
    });

    await logAudit({
      actorId: userId,
      action: AuditActions.LGPD_USER_ANONYMIZED,
      entityType: 'user',
      entityId: userId,
      metadata: { tag },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    logger.warn({ userId }, 'LGPD: conta anonimizada (irreversível)');

    return { anonymized: true, userId };
  }
}
