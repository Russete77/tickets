import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors';
import { CreateFieldInput, UpdateFieldInput, SubmitResponseInput } from './form-fields.validators';
import { EventFormField, TicketFormResponse } from '../../generated/prisma/client';

/**
 * Serviço de gerenciamento de campos de formulário customizados
 */
export class FormFieldsService {
  /**
   * Cria um novo campo de formulário para um evento
   */
  static async createField(eventId: string, data: CreateFieldInput): Promise<EventFormField> {
    try {
      // Verificar se evento existe
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundError('Evento não encontrado');
      }

      // Criar campo
      const field = await prisma.eventFormField.create({
        data: {
          eventId,
          label: data.label,
          type: data.type,
          options: data.options ? data.options : null,
          required: data.required ?? false,
          sortOrder: data.sortOrder ?? 0,
        },
      });

      return field;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw error;
    }
  }

  /**
   * Lista todos os campos de formulário de um evento
   */
  static async listFields(eventId: string): Promise<EventFormField[]> {
    try {
      // Verificar se evento existe
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundError('Evento não encontrado');
      }

      // Buscar campos ordenados
      const fields = await prisma.eventFormField.findMany({
        where: { eventId },
        orderBy: { sortOrder: 'asc' },
      });

      return fields;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw error;
    }
  }

  /**
   * Atualiza um campo de formulário
   */
  static async updateField(fieldId: string, data: UpdateFieldInput): Promise<EventFormField> {
    try {
      // Verificar se campo existe
      const field = await prisma.eventFormField.findUnique({
        where: { id: fieldId },
      });

      if (!field) {
        throw new NotFoundError('Campo não encontrado');
      }

      // Atualizar campo
      const updatedField = await prisma.eventFormField.update({
        where: { id: fieldId },
        data: {
          label: data.label,
          type: data.type,
          options: data.options !== undefined ? data.options : field.options,
          required: data.required,
          sortOrder: data.sortOrder,
        },
      });

      return updatedField;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw error;
    }
  }

  /**
   * Deleta um campo de formulário
   */
  static async deleteField(fieldId: string): Promise<void> {
    try {
      // Verificar se campo existe
      const field = await prisma.eventFormField.findUnique({
        where: { id: fieldId },
      });

      if (!field) {
        throw new NotFoundError('Campo não encontrado');
      }

      // Deletar campo (cascata remove respostas)
      await prisma.eventFormField.delete({
        where: { id: fieldId },
      });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw error;
    }
  }

  /**
   * Submete respostas de formulário para um ticket
   */
  static async submitResponses(ticketId: string, input: SubmitResponseInput): Promise<TicketFormResponse[]> {
    try {
      // Verificar se ticket existe
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new NotFoundError('Ticket não encontrado');
      }

      // Validar que todos os campos existem
      const fieldIds = input.responses.map(r => r.fieldId);
      const fields = await prisma.eventFormField.findMany({
        where: { id: { in: fieldIds } },
      });

      if (fields.length !== fieldIds.length) {
        throw new BadRequestError('Um ou mais campos de formulário não encontrados');
      }

      // Deletar respostas anteriores e criar novas
      const responses = await prisma.$transaction(async (tx) => {
        // Deletar respostas anteriores
        await tx.ticketFormResponse.deleteMany({
          where: { ticketId },
        });

        // Criar novas respostas
        const createdResponses = await Promise.all(
          input.responses.map(response =>
            tx.ticketFormResponse.create({
              data: {
                ticketId,
                fieldId: response.fieldId,
                value: response.value,
              },
            })
          )
        );

        return createdResponses;
      });

      return responses;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) throw error;
      throw error;
    }
  }

  /**
   * Obtém respostas de formulário para um ticket
   */
  static async getResponses(ticketId: string): Promise<TicketFormResponse[]> {
    try {
      // Verificar se ticket existe
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new NotFoundError('Ticket não encontrado');
      }

      // Buscar respostas
      const responses = await prisma.ticketFormResponse.findMany({
        where: { ticketId },
        include: {
          field: true,
        },
      });

      return responses;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw error;
    }
  }

  /**
   * Obtém todas as respostas de um evento para exportação
   */
  static async getEventResponses(eventId: string): Promise<any[]> {
    try {
      // Verificar se evento existe
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundError('Evento não encontrado');
      }

      // Buscar campos do evento
      const fields = await prisma.eventFormField.findMany({
        where: { eventId },
        orderBy: { sortOrder: 'asc' },
      });

      // Buscar todas as respostas
      const responses = await prisma.ticketFormResponse.findMany({
        where: {
          field: {
            eventId,
          },
        },
        include: {
          field: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Agrupar respostas por ticket
      const responsesByTicket = responses.reduce((acc, response) => {
        if (!acc[response.ticketId]) {
          acc[response.ticketId] = {};
        }
        acc[response.ticketId][response.fieldId] = response.value;
        return acc;
      }, {} as Record<string, Record<string, string>>);

      // Converter para array com headers
      const result = Object.entries(responsesByTicket).map(([ticketId, fieldResponses]) => ({
        ticketId,
        ...fieldResponses,
      }));

      return result;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw error;
    }
  }
}
