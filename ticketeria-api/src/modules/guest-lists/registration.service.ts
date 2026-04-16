import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors';

/**
 * Serviço de registro público via share link
 */
export class RegistrationService {
  /**
   * Registrar convidado via share link (público, sem autenticação)
   */
  async registerViaLink(
    shareLink: string,
    data: {
      name: string;
      cpf?: string | null;
      phone?: string | null;
      email?: string | null;
      plusOnes?: number;
    },
  ): Promise<{
    id: string;
    name: string;
    status: string;
    message: string;
  }> {
    // Buscar assignment por share link
    const assignment = await prisma.promoterAssignment.findUnique({
      where: { shareLink },
      include: {
        guestList: true,
      },
    });

    if (!assignment) {
      throw new NotFoundError('Link de registro não encontrado ou expirado');
    }

    const config = assignment.guestList;

    // Validar se está aberto
    if (config.status !== 'active') {
      throw new BadRequestError('Registro está fechado neste momento');
    }

    // Validar se não passou do horário de fechamento
    if (config.closesAt && new Date() > config.closesAt) {
      throw new BadRequestError('Período de registro encerrado');
    }

    // Validar CPF se obrigatório
    if (config.requiresCpf && !data.cpf) {
      throw new BadRequestError('CPF é obrigatório');
    }

    // Validar phone se obrigatório
    if (config.requiresPhone && !data.phone) {
      throw new BadRequestError('Telefone é obrigatório');
    }

    // Validar limites globais
    const totalEntries = await prisma.guestEntry.count({
      where: { guestListId: config.id },
    });

    if (totalEntries >= config.maxGuestsTotal) {
      throw new ConflictError('Limite de inscrições atingido');
    }

    // Validar limites por promotor
    if (config.maxGuestsPerPromoter) {
      const promoterEntries = await prisma.guestEntry.count({
        where: {
          guestListId: config.id,
          promoterId: assignment.promoterId,
        },
      });

      if (promoterEntries >= config.maxGuestsPerPromoter) {
        throw new ConflictError('Limite de convidados para este promotor foi atingido');
      }
    }

    // Validar no. de plus ones
    const plusOnes = Math.min(data.plusOnes || 0, config.maxPlusOnes);

    // Criar entry
    const entry = await prisma.guestEntry.create({
      data: {
        guestListId: config.id,
        promoterId: assignment.promoterId,
        assignmentId: assignment.id,
        name: data.name,
        cpf: data.cpf || null,
        phone: data.phone || null,
        email: data.email || null,
        plusOnes,
        listType: 'free', // Default para registros públicos
        status: config.autoApprove ? 'confirmed' : 'pending',
      },
    });

    // Incrementar contadores no assignment
    await prisma.promoterAssignment.update({
      where: { id: assignment.id },
      data: {
        guestCount: { increment: 1 },
      },
    });

    return {
      id: entry.id,
      name: entry.name,
      status: entry.status,
      message:
        config.autoApprove ?
          'Você foi confirmado! Bem-vindo ao evento.'
          : 'Inscrição recebida. Aguardando confirmação.',
    };
  }

  /**
   * Verificar se um share link é válido
   */
  async validateShareLink(shareLink: string): Promise<{
    valid: boolean;
    promoterName?: string;
    eventName?: string;
    welcomeMessage?: string;
    requiresCpf: boolean;
    requiresPhone: boolean;
    spotsAvailable: number;
  }> {
    const assignment = await prisma.promoterAssignment.findUnique({
      where: { shareLink },
      include: {
        promoter: true,
        guestList: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!assignment) {
      return { valid: false };
    }

    const config = assignment.guestList;
    const event = config.event;

    // Verificar se está ativo
    if (config.status !== 'active') {
      return { valid: false };
    }

    // Verificar se passou do horário
    if (config.closesAt && new Date() > config.closesAt) {
      return { valid: false };
    }

    // Calcular vagas disponíveis
    const totalEntries = await prisma.guestEntry.count({
      where: { guestListId: config.id },
    });
    const spotsAvailable = config.maxGuestsTotal - totalEntries;

    return {
      valid: true,
      promoterName: assignment.promoter.displayName,
      eventName: event.name,
      welcomeMessage: config.welcomeMessage || undefined,
      requiresCpf: config.requiresCpf,
      requiresPhone: config.requiresPhone,
      spotsAvailable,
    };
  }
}

export const registrationService = new RegistrationService();
