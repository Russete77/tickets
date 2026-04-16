import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { CreateAreaInput, UpdateAreaInput } from './areas.validators';

interface EventArea {
  id: string;
  eventId: string;
  name: string;
  capacity: number;
  currentCount: number;
  description?: string | null;
  createdAt: Date;
}

interface AreaCapacity {
  id: string;
  name: string;
  capacity: number;
  currentCount: number;
  percentage: number;
  status: 'normal' | 'warning' | 'critical' | 'full';
}

type CapacityOverview = AreaCapacity[];

export class AreasService {
  /**
   * Cria nova área no evento
   */
  static async createArea(
    eventId: string,
    data: CreateAreaInput,
  ): Promise<EventArea> {
    // Validar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Criar área
    const area = await prisma.eventArea.create({
      data: {
        eventId,
        name: data.name,
        capacity: data.capacity,
        currentCount: 0,
        description: data.description || null,
      },
    });

    // Registrar auditoria
    await logAudit({
      actorId: 'system',
      action: AuditActions.AREA_CREATED,
      entityType: 'EventArea',
      entityId: area.id,
      metadata: { eventId },
    });

    return {
      id: area.id,
      eventId: area.eventId,
      name: area.name,
      capacity: area.capacity,
      currentCount: area.currentCount,
      description: area.description,
      createdAt: area.createdAt,
    };
  }

  /**
   * Lista áreas do evento com contagens em tempo real
   */
  static async listAreas(eventId: string): Promise<EventArea[]> {
    // Validar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    const areas = await prisma.eventArea.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });

    return areas.map((a) => ({
      id: a.id,
      eventId: a.eventId,
      name: a.name,
      capacity: a.capacity,
      currentCount: a.currentCount,
      description: a.description,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Atualiza dados da área
   */
  static async updateArea(
    areaId: string,
    data: UpdateAreaInput,
  ): Promise<EventArea> {
    // Validar se existe
    const area = await prisma.eventArea.findUnique({
      where: { id: areaId },
    });

    if (!area) {
      throw new NotFoundError('Área não encontrada');
    }

    // Preparar dados de update
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.capacity) updateData.capacity = data.capacity;
    if (data.description !== undefined) updateData.description = data.description || null;

    const updated = await prisma.eventArea.update({
      where: { id: areaId },
      data: updateData,
    });

    // Registrar auditoria
    await logAudit({
      actorId: 'system',
      action: AuditActions.AREA_UPDATED,
      entityType: 'EventArea',
      entityId: areaId,
      metadata: { eventId: area.eventId },
    });

    return {
      id: updated.id,
      eventId: updated.eventId,
      name: updated.name,
      capacity: updated.capacity,
      currentCount: updated.currentCount,
      description: updated.description,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Remove área
   */
  static async deleteArea(areaId: string): Promise<void> {
    // Validar se existe
    const area = await prisma.eventArea.findUnique({
      where: { id: areaId },
    });

    if (!area) {
      throw new NotFoundError('Área não encontrada');
    }

    await prisma.eventArea.delete({
      where: { id: areaId },
    });

    // Registrar auditoria
    await logAudit({
      actorId: 'system',
      action: AuditActions.AREA_DELETED,
      entityType: 'EventArea',
      entityId: areaId,
      metadata: { eventId: area.eventId },
    });
  }

  /**
   * Incrementa ou decrementa contagem de pessoas em área (atomicamente)
   */
  static async updateAreaCount(areaId: string, delta: number): Promise<EventArea> {
    // Validar se existe
    const area = await prisma.eventArea.findUnique({
      where: { id: areaId },
    });

    if (!area) {
      throw new NotFoundError('Área não encontrada');
    }

    // Calcular novo count
    const newCount = area.currentCount + delta;

    // Validar se a contagem não fica negativa
    if (newCount < 0) {
      throw new BadRequestError('Contagem de pessoas não pode ser negativa');
    }

    // Validar se não ultrapassa capacidade (opcional - warning, não erro)
    if (newCount > area.capacity) {
      console.warn(
        `Aviso: Área ${areaId} ultrapassou capacidade. ${newCount} / ${area.capacity}`,
      );
    }

    // Atualizar atomicamente
    const updated = await prisma.eventArea.update({
      where: { id: areaId },
      data: {
        currentCount: newCount,
      },
    });

    // Registrar auditoria
    await logAudit({
      actorId: 'system',
      action: AuditActions.AREA_COUNT_UPDATED,
      entityType: 'EventArea',
      entityId: areaId,
      metadata: { eventId: area.eventId, delta, newCount },
    });

    return {
      id: updated.id,
      eventId: updated.eventId,
      name: updated.name,
      capacity: updated.capacity,
      currentCount: updated.currentCount,
      description: updated.description,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Obtém visão geral de capacidade de todas as áreas
   */
  static async getCapacityOverview(eventId: string): Promise<CapacityOverview> {
    // Validar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    const areas = await prisma.eventArea.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });

    return areas.map((area) => {
      const percentage =
        area.capacity > 0 ? Math.round((area.currentCount / area.capacity) * 100) : 0;

      // Determinar status baseado na ocupação
      let status: 'normal' | 'warning' | 'critical' | 'full';
      if (percentage >= 100) {
        status = 'full';
      } else if (percentage >= 90) {
        status = 'critical';
      } else if (percentage >= 75) {
        status = 'warning';
      } else {
        status = 'normal';
      }

      return {
        id: area.id,
        name: area.name,
        capacity: area.capacity,
        currentCount: area.currentCount,
        percentage,
        status,
      };
    });
  }
}
