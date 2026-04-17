import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { CreateItemInput, UpdateItemInput } from './store.validators';

interface StoreItemResponse {
  id: string;
  eventId: string;
  type: 'physical' | 'digital' | 'voucher';
  name: string;
  description?: string | null;
  priceCents: number;
  quantity?: number | null;
  soldCount: number;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
}

export class StoreService {
  /**
   * Cria novo item na loja do evento
   */
  static async createItem(
    eventId: string,
    userId: string,
    data: CreateItemInput,
  ): Promise<StoreItemResponse> {
    // Validar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Converter preço para cents (assumindo que vem em decimal)
    const priceCents = Math.round(data.price * 100);

    // Criar item
    const item = await prisma.storeItem.create({
      data: {
        eventId,
        type: data.type as any,
        name: data.name,
        description: data.description || null,
        priceCents,
        quantity: data.quantity || null,
        imageUrl: data.image || null,
        isActive: true,
      },
    });

    // Registrar auditoria
    await logAudit({
      actorId: userId,
      action: AuditActions.STORE_ITEM_CREATED,
      entityType: 'StoreItem',
      entityId: item.id,
      metadata: { eventId },
    });

    return this.formatItemResponse(item);
  }

  /**
   * Lista itens da loja do evento (apenas ativos)
   */
  static async listItems(eventId: string): Promise<StoreItemResponse[]> {
    // Validar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    const items = await prisma.storeItem.findMany({
      where: {
        eventId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return items.map((item) => this.formatItemResponse(item));
  }

  /**
   * Obtém um item específico da loja
   */
  static async getItem(id: string): Promise<StoreItemResponse> {
    const item = await prisma.storeItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundError('Item não encontrado');
    }

    if (!item.isActive) {
      throw new NotFoundError('Item não encontrado');
    }

    return this.formatItemResponse(item);
  }

  /**
   * Atualiza um item da loja
   */
  static async updateItem(
    id: string,
    userId: string,
    data: UpdateItemInput,
  ): Promise<StoreItemResponse> {
    // Validar se existe
    const item = await prisma.storeItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundError('Item não encontrado');
    }

    if (!item.isActive) {
      throw new NotFoundError('Item não encontrado');
    }

    // Preparar dados de update
    const updateData: any = {};
    if (data.type) updateData.type = data.type;
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.price !== undefined) updateData.priceCents = Math.round(data.price * 100);
    if (data.quantity !== undefined) updateData.quantity = data.quantity || null;
    if (data.image !== undefined) updateData.imageUrl = data.image || null;

    const updated = await prisma.storeItem.update({
      where: { id },
      data: updateData,
    });

    // Registrar auditoria
    await logAudit({
      actorId: userId,
      action: AuditActions.STORE_ITEM_UPDATED,
      entityType: 'StoreItem',
      entityId: id,
      metadata: { eventId: item.eventId },
    });

    return this.formatItemResponse(updated);
  }

  /**
   * Desativa um item (soft delete)
   */
  static async deleteItem(id: string, userId: string): Promise<void> {
    // Validar se existe
    const item = await prisma.storeItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundError('Item não encontrado');
    }

    if (!item.isActive) {
      throw new NotFoundError('Item não encontrado');
    }

    await prisma.storeItem.update({
      where: { id },
      data: { isActive: false },
    });

    // Registrar auditoria
    await logAudit({
      actorId: userId,
      action: AuditActions.STORE_ITEM_DELETED,
      entityType: 'StoreItem',
      entityId: id,
      metadata: { eventId: item.eventId },
    });
  }

  /**
   * Processa compra de item (decrementa quantidade)
   */
  static async purchaseItem(
    itemId: string,
    userId: string,
    quantity: number,
  ): Promise<StoreItemResponse> {
    // Validar se existe
    const item = await prisma.storeItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundError('Item não encontrado');
    }

    if (!item.isActive) {
      throw new NotFoundError('Item não encontrado');
    }

    // Validar quantidade disponível (se tem limite)
    if (item.quantity !== null && item.soldCount + quantity > item.quantity) {
      throw new BadRequestError('Quantidade insuficiente em estoque');
    }

    // Incrementar soldCount atomicamente
    const updated = await prisma.storeItem.update({
      where: { id: itemId },
      data: {
        soldCount: {
          increment: quantity,
        },
      },
    });

    // Registrar auditoria
    await logAudit({
      actorId: userId,
      action: AuditActions.STORE_ITEM_PURCHASED,
      entityType: 'StoreItem',
      entityId: itemId,
      metadata: { eventId: item.eventId, quantity },
    });

    return this.formatItemResponse(updated);
  }

  /**
   * Formata resposta de item
   */
  private static formatItemResponse(item: any): StoreItemResponse {
    return {
      id: item.id,
      eventId: item.eventId,
      type: item.type,
      name: item.name,
      description: item.description,
      priceCents: item.priceCents,
      quantity: item.quantity,
      soldCount: item.soldCount,
      imageUrl: item.imageUrl,
      isActive: item.isActive,
      createdAt: item.createdAt,
    };
  }
}

export const storeService = new StoreService();
