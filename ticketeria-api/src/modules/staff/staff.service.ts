import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { CreateStaffInput, UpdateStaffInput } from './staff.validators';

interface StaffMember {
  id: string;
  eventId: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
  role: string;
  checkedIn: boolean;
  checkedInAt?: Date | null;
  createdAt: Date;
}

interface StaffDashboard {
  totalStaff: number;
  checkedIn: number;
  pending: number;
  byRole: Array<{
    role: string;
    total: number;
    checkedIn: number;
  }>;
}

export class StaffService {
  /**
   * Adiciona novo membro de staff ao evento
   */
  static async addStaffMember(
    eventId: string,
    data: CreateStaffInput,
  ): Promise<StaffMember> {
    // Validar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Criar membro de staff
    const staff = await prisma.eventStaff.create({
      data: {
        eventId,
        name: data.name,
        cpf: data.cpf || null,
        phone: data.phone || null,
        role: data.role as any,
        checkedIn: false,
      },
    });

    // Registrar auditoria
    await logAudit({
      actorId: 'system',
      action: AuditActions.STAFF_ADDED,
      entityType: 'EventStaff',
      entityId: staff.id,
      metadata: { eventId },
    });

    return {
      id: staff.id,
      eventId: staff.eventId,
      name: staff.name,
      cpf: staff.cpf,
      phone: staff.phone,
      role: staff.role,
      checkedIn: staff.checkedIn,
      checkedInAt: staff.checkedInAt,
      createdAt: staff.createdAt,
    };
  }

  /**
   * Lista membros de staff do evento
   */
  static async listStaff(eventId: string): Promise<StaffMember[]> {
    // Validar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    const staff = await prisma.eventStaff.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    return staff.map((s) => ({
      id: s.id,
      eventId: s.eventId,
      name: s.name,
      cpf: s.cpf,
      phone: s.phone,
      role: s.role,
      checkedIn: s.checkedIn,
      checkedInAt: s.checkedInAt,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Atualiza dados do membro de staff
   */
  static async updateStaff(
    staffId: string,
    data: UpdateStaffInput,
  ): Promise<StaffMember> {
    // Validar se existe
    const staff = await prisma.eventStaff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundError('Membro de staff não encontrado');
    }

    // Preparar dados de update
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.cpf) updateData.cpf = data.cpf;
    if (data.phone) updateData.phone = data.phone;
    if (data.role) updateData.role = data.role;

    const updated = await prisma.eventStaff.update({
      where: { id: staffId },
      data: updateData,
    });

    // Registrar auditoria
    await logAudit({
      actorId: 'system',
      action: AuditActions.STAFF_UPDATED,
      entityType: 'EventStaff',
      entityId: staffId,
      metadata: { eventId: staff.eventId },
    });

    return {
      id: updated.id,
      eventId: updated.eventId,
      name: updated.name,
      cpf: updated.cpf,
      phone: updated.phone,
      role: updated.role,
      checkedIn: updated.checkedIn,
      checkedInAt: updated.checkedInAt,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Remove membro de staff
   */
  static async removeStaff(staffId: string): Promise<void> {
    // Validar se existe
    const staff = await prisma.eventStaff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundError('Membro de staff não encontrado');
    }

    await prisma.eventStaff.delete({
      where: { id: staffId },
    });

    // Registrar auditoria
    await logAudit({
      actorId: 'system',
      action: AuditActions.STAFF_REMOVED,
      entityType: 'EventStaff',
      entityId: staffId,
      metadata: { eventId: staff.eventId },
    });
  }

  /**
   * Realiza check-in de membro de staff
   */
  static async checkinStaff(staffId: string, notes?: string): Promise<StaffMember> {
    // Validar se existe
    const staff = await prisma.eventStaff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundError('Membro de staff não encontrado');
    }

    // Atualizar check-in
    const updated = await prisma.eventStaff.update({
      where: { id: staffId },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
      },
    });

    // Registrar auditoria
    await logAudit({
      actorId: 'system',
      action: AuditActions.STAFF_CHECKED_IN,
      entityType: 'EventStaff',
      entityId: staffId,
      metadata: { eventId: staff.eventId, notes },
    });

    return {
      id: updated.id,
      eventId: updated.eventId,
      name: updated.name,
      cpf: updated.cpf,
      phone: updated.phone,
      role: updated.role,
      checkedIn: updated.checkedIn,
      checkedInAt: updated.checkedInAt,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Obtém dashboard de staff para o evento
   */
  static async getStaffDashboard(eventId: string): Promise<StaffDashboard> {
    // Validar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Total de staff
    const totalStaff = await prisma.eventStaff.count({
      where: { eventId },
    });

    // Staff com check-in
    const checkedIn = await prisma.eventStaff.count({
      where: {
        eventId,
        checkedIn: true,
      },
    });

    const pending = totalStaff - checkedIn;

    // Contar por role
    const byRole = await prisma.eventStaff.groupBy({
      by: ['role'],
      where: { eventId },
      _count: true,
    });

    // Enriquecer com dados de check-in
    const enrichedByRole = await Promise.all(
      byRole.map(async (group) => {
        const checkedInByRole = await prisma.eventStaff.count({
          where: {
            eventId,
            role: group.role,
            checkedIn: true,
          },
        });

        return {
          role: group.role,
          total: group._count,
          checkedIn: checkedInByRole,
        };
      }),
    );

    return {
      totalStaff,
      checkedIn,
      pending,
      byRole: enrichedByRole,
    };
  }
}
