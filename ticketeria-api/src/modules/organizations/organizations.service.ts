/**
 * OrganizationsService — multi-tenancy core.
 * Auditoria CTO 2026-05 — gap 4.1
 */
import { prisma } from '../../config/database';
import { logAudit, AuditActions } from '../../shared/audit';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors';
import { OrgMemberRole, OrgType } from '../../generated/prisma/client';

interface CreateOrganizationInput {
  name: string;
  slug?: string;
  type?: OrgType;
  cnpj?: string;
  defaultCurrency?: string;
  defaultLocale?: string;
}

interface InviteMemberInput {
  organizationId: string;
  email: string;
  role: OrgMemberRole;
  invitedBy: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
}

export class OrganizationsService {
  /**
   * Cria organização e adiciona o criador como owner.
   */
  static async create(userId: string, input: CreateOrganizationInput) {
    const baseSlug = input.slug ?? slugify(input.name);
    if (!baseSlug) {
      throw new BadRequestError('Nome inválido para gerar slug');
    }

    let slug = baseSlug;
    let attempt = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.name,
          slug,
          type: input.type ?? 'producer',
          cnpj: input.cnpj,
          defaultCurrency: input.defaultCurrency ?? 'BRL',
          defaultLocale: input.defaultLocale ?? 'pt-BR',
        },
      });
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: 'owner',
          acceptedAt: new Date(),
        },
      });
      return org;
    });

    await logAudit({
      actorId: userId,
      action: AuditActions.ORGANIZATION_CREATED,
      entityType: 'organization',
      entityId: organization.id,
    });

    return organization;
  }

  static async listForUser(userId: string) {
    return prisma.organizationMember.findMany({
      where: { userId, acceptedAt: { not: null } },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async getById(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { members: true },
    });
    if (!org) throw new NotFoundError('Organização não encontrada');
    return org;
  }

  static async inviteMember(input: InviteMemberInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new NotFoundError('Usuário não encontrado. Peça que ele crie conta primeiro.');
    }

    const existing = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: user.id,
        },
      },
    });
    if (existing) {
      throw new ConflictError('Usuário já é membro desta organização');
    }

    const member = await prisma.organizationMember.create({
      data: {
        organizationId: input.organizationId,
        userId: user.id,
        role: input.role,
        invitedBy: input.invitedBy,
      },
    });

    await logAudit({
      actorId: input.invitedBy,
      action: AuditActions.ORGANIZATION_MEMBER_INVITED,
      entityType: 'organization_member',
      entityId: `${input.organizationId}:${user.id}`,
      metadata: { role: input.role, email: input.email },
    });

    return member;
  }

  static async updateMemberRole(
    organizationId: string,
    userId: string,
    newRole: OrgMemberRole,
    actorId: string,
  ) {
    if (userId === actorId) {
      throw new BadRequestError('Não é possível alterar seu próprio role');
    }
    const updated = await prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId, userId } },
      data: { role: newRole },
    });
    await logAudit({
      actorId,
      action: AuditActions.ORGANIZATION_MEMBER_ROLE_CHANGED,
      entityType: 'organization_member',
      entityId: `${organizationId}:${userId}`,
      metadata: { newRole },
    });
    return updated;
  }

  static async removeMember(organizationId: string, userId: string, actorId: string) {
    if (userId === actorId) {
      throw new BadRequestError('Use a rota de saída voluntária');
    }
    await prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId, userId } },
    });
    await logAudit({
      actorId,
      action: AuditActions.ORGANIZATION_MEMBER_REMOVED,
      entityType: 'organization_member',
      entityId: `${organizationId}:${userId}`,
    });
  }

  static async acceptInvite(organizationId: string, userId: string) {
    const member = await prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId, userId } },
      data: { acceptedAt: new Date() },
    });
    await logAudit({
      actorId: userId,
      action: AuditActions.ORGANIZATION_INVITE_ACCEPTED,
      entityType: 'organization_member',
      entityId: `${organizationId}:${userId}`,
    });
    return member;
  }
}
