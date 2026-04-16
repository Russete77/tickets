import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors';
import { CreateInsuranceInput, UpdateInsuranceInput } from './insurance.validators';
import { EventInsurance } from '../../generated/prisma/client';

/**
 * Serviço de gerenciamento de seguro de evento
 */
export class InsuranceService {
  /**
   * Cria um novo registro de seguro para um evento
   */
  static async create(eventId: string, data: CreateInsuranceInput): Promise<EventInsurance> {
    try {
      // Verificar se evento existe
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundError('Evento não encontrado');
      }

      // Verificar se já existe seguro para este evento
      const existingInsurance = await prisma.eventInsurance.findUnique({
        where: { eventId },
      });

      if (existingInsurance) {
        throw new ConflictError('Já existe um seguro associado a este evento');
      }

      // Validar datas
      const startsAt = new Date(data.startsAt);
      const endsAt = new Date(data.endsAt);

      if (endsAt <= startsAt) {
        throw new BadRequestError('Data de término deve ser após data de início');
      }

      // Criar registro de seguro
      const insurance = await prisma.eventInsurance.create({
        data: {
          eventId,
          provider: data.provider,
          coverageType: data.coverageType,
          coverageAmount: data.coverageAmount,
          premiumCents: data.premiumCents,
          startsAt,
          endsAt,
          status: 'active',
        },
      });

      return insurance;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConflictError || error instanceof BadRequestError) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Obtém seguro de um evento
   */
  static async getByEvent(eventId: string): Promise<EventInsurance | null> {
    try {
      // Verificar se evento existe
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundError('Evento não encontrado');
      }

      // Buscar seguro
      const insurance = await prisma.eventInsurance.findUnique({
        where: { eventId },
      });

      return insurance;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw error;
    }
  }

  /**
   * Atualiza um registro de seguro
   */
  static async update(insuranceId: string, data: UpdateInsuranceInput): Promise<EventInsurance> {
    try {
      // Verificar se seguro existe
      const insurance = await prisma.eventInsurance.findUnique({
        where: { id: insuranceId },
      });

      if (!insurance) {
        throw new NotFoundError('Seguro não encontrado');
      }

      // Validar datas se foram alteradas
      if (data.startsAt || data.endsAt) {
        const startsAt = data.startsAt ? new Date(data.startsAt) : insurance.startsAt;
        const endsAt = data.endsAt ? new Date(data.endsAt) : insurance.endsAt;

        if (endsAt <= startsAt) {
          throw new BadRequestError('Data de término deve ser após data de início');
        }
      }

      // Atualizar seguro
      const updatedInsurance = await prisma.eventInsurance.update({
        where: { id: insuranceId },
        data: {
          provider: data.provider,
          coverageType: data.coverageType,
          coverageAmount: data.coverageAmount,
          premiumCents: data.premiumCents,
          startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
          endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        },
      });

      return updatedInsurance;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) throw error;
      throw error;
    }
  }

  /**
   * Deleta um registro de seguro
   */
  static async delete(insuranceId: string): Promise<void> {
    try {
      // Verificar se seguro existe
      const insurance = await prisma.eventInsurance.findUnique({
        where: { id: insuranceId },
      });

      if (!insurance) {
        throw new NotFoundError('Seguro não encontrado');
      }

      // Deletar seguro
      await prisma.eventInsurance.delete({
        where: { id: insuranceId },
      });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw error;
    }
  }
}
