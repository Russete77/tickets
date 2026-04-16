import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { Credential } from '../../generated/prisma/client';
import { CreateCredentialInput, ListCredentialsInput, BulkCreateInput } from './credentials.validators';
import crypto from 'crypto';

/**
 * Serviço de gerenciamento de credenciais
 */
export class CredentialsService {
  /**
   * Criar credencial para participante
   */
  static async create(
    eventId: string,
    userId: string,
    data: CreateCredentialInput,
  ): Promise<Credential> {
    // Verificar se o usuário é produtor do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para criar credenciais neste evento');
    }

    // Se ticketId foi fornecido, validar
    if (data.ticketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: data.ticketId },
      });

      if (!ticket) {
        throw new NotFoundError('Ingresso não encontrado');
      }

      if (ticket.eventId !== eventId) {
        throw new BadRequestError('Ingresso não pertence a este evento');
      }
    }

    // Gerar código QR único
    const qrCode = this.generateQRCode();

    // Criar credencial
    const credential = await prisma.credential.create({
      data: {
        eventId,
        ticketId: data.ticketId,
        name: data.name,
        company: data.company,
        jobTitle: data.jobTitle,
        category: data.category,
        qrCode,
        customFields: data.customFields,
      },
    });

    // Log de auditoria
    await logAudit({
      action: AuditActions.CREDENTIAL_CREATED,
      userId,
      resourceId: credential.id,
      resourceType: 'Credential',
      details: {
        eventId,
        name: data.name,
        category: data.category,
      },
    });

    return credential;
  }

  /**
   * Listar credenciais de um evento
   */
  static async list(
    eventId: string,
    userId: string,
    pagination: ListCredentialsInput,
  ): Promise<{
    data: Credential[];
    cursor: string | null;
    hasMore: boolean;
  }> {
    // Verificar se o usuário é produtor do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para visualizar credenciais deste evento');
    }

    const limit = pagination.limit || 20;
    const direction = pagination.direction || 'forward';

    const where: { eventId: string; category?: string } = { eventId };
    if (pagination.category) {
      where.category = pagination.category;
    }

    const credentials = await prisma.credential.findMany({
      where,
      take: direction === 'forward' ? limit + 1 : -(limit + 1),
      skip: pagination.cursor ? 1 : 0,
      cursor: pagination.cursor ? { id: pagination.cursor } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const hasMore = credentials.length > limit;
    const data = hasMore ? credentials.slice(0, -1) : credentials;
    const cursor = data.length > 0 ? data[data.length - 1].id : null;

    return {
      data,
      cursor,
      hasMore,
    };
  }

  /**
   * Obter credencial por ID
   */
  static async getById(id: string): Promise<Credential> {
    const credential = await prisma.credential.findUnique({
      where: { id },
    });

    if (!credential) {
      throw new NotFoundError('Credencial não encontrada');
    }

    return credential;
  }

  /**
   * Check-in na credencial
   */
  static async checkin(id: string): Promise<Credential> {
    const credential = await prisma.credential.findUnique({
      where: { id },
    });

    if (!credential) {
      throw new NotFoundError('Credencial não encontrada');
    }

    // Atualizar data de check-in
    const updatedCredential = await prisma.credential.update({
      where: { id },
      data: {
        checkedInAt: new Date(),
      },
    });

    // Log de auditoria
    await logAudit({
      action: AuditActions.CREDENTIAL_CHECKED_IN,
      resourceId: id,
      resourceType: 'Credential',
      details: {
        eventId: credential.eventId,
        credentialName: credential.name,
      },
    });

    return updatedCredential;
  }

  /**
   * Criar múltiplas credenciais em lote
   */
  static async bulkCreate(
    eventId: string,
    userId: string,
    entries: BulkCreateInput,
  ): Promise<{
    created: number;
    credentials: Credential[];
    errors: Array<{ index: number; error: string }>;
  }> {
    // Verificar se o usuário é produtor do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para criar credenciais neste evento');
    }

    const credentials: Credential[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    // Processar cada entrada
    for (let i = 0; i < entries.length; i++) {
      try {
        const entry = entries[i];

        // Validar ticket se fornecido
        if (entry.ticketId) {
          const ticket = await prisma.ticket.findUnique({
            where: { id: entry.ticketId },
          });

          if (!ticket || ticket.eventId !== eventId) {
            throw new BadRequestError('Ingresso inválido ou não pertence ao evento');
          }
        }

        // Gerar código QR único
        const qrCode = this.generateQRCode();

        // Criar credencial
        const credential = await prisma.credential.create({
          data: {
            eventId,
            ticketId: entry.ticketId,
            name: entry.name,
            company: entry.company,
            jobTitle: entry.jobTitle,
            category: entry.category,
            qrCode,
            customFields: entry.customFields,
          },
        });

        credentials.push(credential);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    // Log de auditoria
    if (credentials.length > 0) {
      await logAudit({
        action: AuditActions.CREDENTIAL_BULK_CREATED,
        userId,
        resourceId: eventId,
        resourceType: 'Credential',
        details: {
          eventId,
          createdCount: credentials.length,
          errorCount: errors.length,
          totalEntries: entries.length,
        },
      });
    }

    return {
      created: credentials.length,
      credentials,
      errors,
    };
  }

  /**
   * Gerar código QR único
   */
  private static generateQRCode(): string {
    return crypto.randomBytes(10).toString('hex').toUpperCase().slice(0, 20);
  }
}
