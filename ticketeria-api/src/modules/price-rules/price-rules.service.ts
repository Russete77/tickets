import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../shared/errors';

interface PriceRule {
  id: string;
  batchId: string;
  priceType: string;
  priceCents: number;
  quantity: number | null;
  soldCount: number;
  remainingQuantity: number | null;
  requiresDoc: boolean;
  isActive: boolean;
  createdAt: Date;
}

interface AvailabilityItem {
  priceType: string;
  priceCents: number;
  totalQuantity: number | null;
  soldCount: number;
  remainingQuantity: number | null;
  requiresDoc: boolean;
  isAvailable: boolean;
}

/**
 * Serviço de gerenciamento de regras de preço
 */
export class PriceRulesService {
  /**
   * Cria uma nova regra de preço para um lote
   */
  async createRule(
    userId: string,
    batchId: string,
    data: {
      priceType: string;
      priceCents: number;
      quantity?: number;
      requiresDoc: boolean;
    },
  ): Promise<PriceRule> {
    // Verificar se o lote existe e se o usuário é produtor do evento
    const batch = await prisma.ticketBatch.findUnique({
      where: { id: batchId },
      include: { event: true },
    });

    if (!batch) {
      throw new NotFoundError('Lote de ingressos não encontrado');
    }

    // Verificar se o usuário é produtor do evento
    const isProducer = batch.event.producerId === userId;
    if (!isProducer) {
      throw new ForbiddenError('Você não tem permissão para modificar este lote');
    }

    // Validação: se for meia-entrada, o preço deve ser no máximo 50% do preço integral
    if (data.priceType.startsWith('meia_')) {
      const maxPrice = Math.floor(batch.priceCents * 0.5);
      if (data.priceCents > maxPrice) {
        throw new BadRequestError(
          `Preço de meia-entrada não pode exceder 50% do preço integral (máximo: R$ ${(maxPrice / 100).toFixed(2)})`,
        );
      }
    }

    // Criar a regra de preço
    const rule = await prisma.ticketPriceRule.create({
      data: {
        batchId,
        priceType: data.priceType as any,
        priceCents: data.priceCents,
        quantity: data.quantity || null,
        requiresDoc: data.requiresDoc,
        isActive: true,
      },
    });

    return {
      id: rule.id,
      batchId: rule.batchId,
      priceType: rule.priceType,
      priceCents: rule.priceCents,
      quantity: rule.quantity,
      soldCount: rule.soldCount,
      remainingQuantity:
        rule.quantity !== null ? rule.quantity - rule.soldCount : null,
      requiresDoc: rule.requiresDoc,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
    };
  }

  /**
   * Obtém todas as regras de preço ativas de um lote
   */
  async getRules(batchId: string): Promise<PriceRule[]> {
    // Verificar se o lote existe
    const batch = await prisma.ticketBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundError('Lote de ingressos não encontrado');
    }

    const rules = await prisma.ticketPriceRule.findMany({
      where: {
        batchId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return rules.map((rule) => ({
      id: rule.id,
      batchId: rule.batchId,
      priceType: rule.priceType,
      priceCents: rule.priceCents,
      quantity: rule.quantity,
      soldCount: rule.soldCount,
      remainingQuantity:
        rule.quantity !== null ? rule.quantity - rule.soldCount : null,
      requiresDoc: rule.requiresDoc,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
    }));
  }

  /**
   * Atualiza uma regra de preço
   */
  async updateRule(
    userId: string,
    ruleId: string,
    data: {
      priceCents?: number;
      quantity?: number;
      requiresDoc?: boolean;
      isActive?: boolean;
    },
  ): Promise<PriceRule> {
    // Buscar a regra
    const rule = await prisma.ticketPriceRule.findUnique({
      where: { id: ruleId },
      include: { batch: { include: { event: true } } },
    });

    if (!rule) {
      throw new NotFoundError('Regra de preço não encontrada');
    }

    // Verificar permissão
    const isProducer = rule.batch.event.producerId === userId;
    if (!isProducer) {
      throw new ForbiddenError('Você não tem permissão para modificar esta regra');
    }

    // Validação: se for meia-entrada, o preço deve ser no máximo 50% do preço integral
    const priceToValidate = data.priceCents ?? rule.priceCents;
    if (rule.priceType.startsWith('meia_')) {
      const maxPrice = Math.floor(rule.batch.priceCents * 0.5);
      if (priceToValidate > maxPrice) {
        throw new BadRequestError(
          `Preço de meia-entrada não pode exceder 50% do preço integral (máximo: R$ ${(maxPrice / 100).toFixed(2)})`,
        );
      }
    }

    // Atualizar
    const updatedRule = await prisma.ticketPriceRule.update({
      where: { id: ruleId },
      data: {
        priceCents: data.priceCents,
        quantity: data.quantity,
        requiresDoc: data.requiresDoc,
        isActive: data.isActive,
      },
    });

    return {
      id: updatedRule.id,
      batchId: updatedRule.batchId,
      priceType: updatedRule.priceType,
      priceCents: updatedRule.priceCents,
      quantity: updatedRule.quantity,
      soldCount: updatedRule.soldCount,
      remainingQuantity:
        updatedRule.quantity !== null
          ? updatedRule.quantity - updatedRule.soldCount
          : null,
      requiresDoc: updatedRule.requiresDoc,
      isActive: updatedRule.isActive,
      createdAt: updatedRule.createdAt,
    };
  }

  /**
   * Deleta uma regra de preço (soft delete)
   */
  async deleteRule(userId: string, ruleId: string): Promise<void> {
    // Buscar a regra
    const rule = await prisma.ticketPriceRule.findUnique({
      where: { id: ruleId },
      include: { batch: { include: { event: true } } },
    });

    if (!rule) {
      throw new NotFoundError('Regra de preço não encontrada');
    }

    // Verificar permissão
    const isProducer = rule.batch.event.producerId === userId;
    if (!isProducer) {
      throw new ForbiddenError('Você não tem permissão para deletar esta regra');
    }

    // Soft delete: apenas marcar como inativa
    await prisma.ticketPriceRule.update({
      where: { id: ruleId },
      data: { isActive: false },
    });
  }

  /**
   * Verifica a disponibilidade de cada tipo de preço em um lote
   */
  async checkAvailability(batchId: string): Promise<AvailabilityItem[]> {
    // Verificar se o lote existe
    const batch = await prisma.ticketBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundError('Lote de ingressos não encontrado');
    }

    // Buscar todas as regras ativas
    const rules = await prisma.ticketPriceRule.findMany({
      where: {
        batchId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return rules.map((rule) => {
      const remainingQuantity =
        rule.quantity !== null ? rule.quantity - rule.soldCount : null;
      const isAvailable =
        remainingQuantity === null || remainingQuantity > 0;

      return {
        priceType: rule.priceType,
        priceCents: rule.priceCents,
        totalQuantity: rule.quantity,
        soldCount: rule.soldCount,
        remainingQuantity,
        requiresDoc: rule.requiresDoc,
        isAvailable,
      };
    });
  }
}

export const priceRulesService = new PriceRulesService();
