import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { Certificate } from '../../generated/prisma/client';
import { CreateCertificateInput, ListCertificatesInput } from './certificates.validators';
import crypto from 'crypto';

/**
 * Serviço de gerenciamento de certificados
 */
export class CertificatesService {
  /**
   * Emitir certificado para um participante
   */
  static async issue(
    eventId: string,
    userId: string,
    data: CreateCertificateInput,
  ): Promise<Certificate> {
    // Verificar se o usuário é produtor do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para emitir certificados neste evento');
    }

    // Verificar se o ticket existe e pertence ao evento
    const ticket = await prisma.ticket.findUnique({
      where: { id: data.ticketId },
    });

    if (!ticket) {
      throw new NotFoundError('Ingresso não encontrado');
    }

    if (ticket.eventId !== eventId) {
      throw new BadRequestError('Ingresso não pertence a este evento');
    }

    // Gerar código único para o certificado
    const code = this.generateCertificateCode();

    // Criar certificado
    const certificate = await prisma.certificate.create({
      data: {
        eventId,
        ticketId: data.ticketId,
        userId: ticket.holderId,
        code,
        holderName: data.holderName,
        hours: data.hours,
      },
    });

    // Log de auditoria
    await logAudit({
      action: AuditActions.CERTIFICATE_ISSUED,
      userId,
      resourceId: certificate.id,
      resourceType: 'Certificate',
      details: {
        eventId,
        holderName: data.holderName,
      },
    });

    return certificate;
  }

  /**
   * Listar certificados de um evento
   */
  static async listByEvent(
    eventId: string,
    userId: string,
    pagination: ListCertificatesInput,
  ): Promise<{
    data: Certificate[];
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
      throw new ForbiddenError('Você não tem permissão para visualizar certificados deste evento');
    }

    const limit = pagination.limit || 20;
    const direction = pagination.direction || 'forward';

    const certificates = await prisma.certificate.findMany({
      where: { eventId },
      take: direction === 'forward' ? limit + 1 : -(limit + 1),
      skip: pagination.cursor ? 1 : 0,
      cursor: pagination.cursor ? { id: pagination.cursor } : undefined,
      orderBy: {
        issuedAt: 'desc',
      },
    });

    const hasMore = certificates.length > limit;
    const data = hasMore ? certificates.slice(0, -1) : certificates;
    const cursor = data.length > 0 ? data[data.length - 1].id : null;

    return {
      data,
      cursor,
      hasMore,
    };
  }

  /**
   * Verificar certificado por código (público)
   */
  static async verify(code: string): Promise<Certificate> {
    const certificate = await prisma.certificate.findUnique({
      where: { code },
    });

    if (!certificate) {
      throw new NotFoundError('Certificado não encontrado');
    }

    return certificate;
  }

  /**
   * Obter certificado por ID
   */
  static async getById(id: string): Promise<Certificate> {
    const certificate = await prisma.certificate.findUnique({
      where: { id },
    });

    if (!certificate) {
      throw new NotFoundError('Certificado não encontrado');
    }

    return certificate;
  }

  /**
   * Gerar URL do PDF do certificado
   */
  static async generatePdf(id: string): Promise<{ pdfUrl: string }> {
    const certificate = await prisma.certificate.findUnique({
      where: { id },
    });

    if (!certificate) {
      throw new NotFoundError('Certificado não encontrado');
    }

    // Aqui você implementaria a lógica de geração do PDF
    // Por enquanto, retornamos uma URL genérica que poderia ser processada por um serviço externo
    const pdfUrl = `https://api.example.com/certificates/${id}/download`;

    // Atualizar URL no banco se necessário
    await prisma.certificate.update({
      where: { id },
      data: { pdfUrl },
    });

    return { pdfUrl };
  }

  /**
   * Gerar código único para certificado
   */
  private static generateCertificateCode(): string {
    return crypto.randomBytes(10).toString('hex').toUpperCase().slice(0, 20);
  }
}
