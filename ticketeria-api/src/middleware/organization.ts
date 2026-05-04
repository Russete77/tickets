/**
 * Middleware de organização (multi-tenant).
 *
 * Carrega o `OrganizationMember` do usuário atual para um `organizationId`
 * presente no path/query/body, e valida o role exigido.
 *
 * Uso:
 *   router.post(
 *     '/organizations/:organizationId/events',
 *     authenticate,
 *     requireOrganizationRole('owner', 'admin'),
 *     controller.createEvent,
 *   );
 *
 * Auditoria CTO 2026-05 — gap 4.1
 */
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { ForbiddenError, UnauthorizedError, BadRequestError } from '../shared/errors';
import { OrgMemberRole } from '../generated/prisma/client';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      organizationId?: string;
      organizationRole?: OrgMemberRole;
    }
  }
}

const ROLE_HIERARCHY: Record<OrgMemberRole, number> = {
  owner: 100,
  admin: 80,
  finance: 60,
  operator: 40,
  promoter: 20,
  viewer: 10,
};

function extractOrganizationId(req: Request): string | undefined {
  return (
    (req.params?.organizationId as string | undefined) ??
    (req.query?.organizationId as string | undefined) ??
    (req.body?.organizationId as string | undefined)
  );
}

/**
 * Exige que o usuário seja membro da organização com role >= um dos passados.
 * Hierarquia: owner > admin > finance > operator > promoter > viewer.
 */
export function requireOrganizationRole(...allowed: OrgMemberRole[]) {
  if (allowed.length === 0) {
    throw new Error('requireOrganizationRole: passar ao menos um role');
  }
  const minRequired = Math.min(...allowed.map((r) => ROLE_HIERARCHY[r]));

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new UnauthorizedError('Não autenticado'));
    }

    const organizationId = extractOrganizationId(req);
    if (!organizationId) {
      return next(new BadRequestError('organizationId é obrigatório'));
    }

    // Admin global da plataforma sempre passa.
    if (req.user.role === 'admin') {
      req.organizationId = organizationId;
      req.organizationRole = 'owner';
      return next();
    }

    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: req.user.userId,
        },
      },
    });

    if (!member || !member.acceptedAt) {
      return next(new ForbiddenError('Você não é membro desta organização'));
    }

    if (ROLE_HIERARCHY[member.role] < minRequired) {
      return next(
        new ForbiddenError(
          `Role insuficiente. Necessário: ${allowed.join(' ou ')}, atual: ${member.role}`,
        ),
      );
    }

    req.organizationId = organizationId;
    req.organizationRole = member.role;
    next();
  };
}

/**
 * Versão "any role" — só exige ser membro aceito.
 */
export function requireOrganizationMember() {
  return requireOrganizationRole('viewer');
}

/**
 * Lista organizações onde o usuário é membro.
 * Útil para login/me.
 */
export async function getUserOrganizations(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId, acceptedAt: { not: null } },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          domain: true,
          branding: true,
          defaultCurrency: true,
          defaultLocale: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}
