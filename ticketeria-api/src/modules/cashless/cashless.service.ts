import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors';
import { CreateCashlessConfigInput, UpdateCashlessConfigInput } from './cashless.validators';

export interface CashlessConfig {
  id: string;
  eventId: string;
  minTopupCents: number;
  maxTopupCents: number;
  maxBalanceCents: number; // mapped from maxWalletBalance
  paymentMethods: string[]; // mapped from tipOptions or []
  enableWristbands: boolean; // stub
  enableCards: boolean; // stub
  enableMobile: boolean; // stub
  refundMaxDays: number; // mapped from refundDeadlineDays
  isActive: boolean; // mapped from isEnabled
  walletCount?: number;
  totalVolumeCents?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface DashboardStats {
  totalWallets: number;
  activeWallets: number;
  totalTopupsCents: number;
  totalSpentCents: number;
  avgBalanceCents: number;
  totalRefundsCents: number;
  transactionCount: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  totalQty: number;
  totalRevenueCents: number;
}

export interface HourlyStats {
  hour: number;
  transactionCount: number;
  totalAmountCents: number;
  uniqueWallets: number;
}

export interface PosRevenue {
  posId: string | null;
  posName: string;
  posLocation: string | null;
  transactionCount: number;
  totalAmountCents: number;
  totalTipsCents: number;
  uniqueWallets: number;
  averageTicketCents: number;
}

/**
 * Serviço de configuração e analytics de cashless
 */
export class CashlessService {
  private readonly CACHE_TTL = 3600; // 1 hora

  /**
   * Cria/atualiza configuração de cashless para um evento
   */
  async createConfig(
    eventId: string,
    userId: string,
    data: CreateCashlessConfigInput,
  ): Promise<CashlessConfig> {
    // Validar propriedade do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { producerId: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Apenas o produtor do evento pode configurar cashless');
    }

    // Criar ou atualizar configuração
    const config = await prisma.cashlessConfig.upsert({
      where: { eventId },
      update: {
        minTopupCents: data.minTopupCents,
        maxTopupCents: data.maxTopupCents,
        maxWalletBalance: data.maxBalanceCents,
        refundDeadlineDays: data.refundMaxDays,
        isEnabled: true,
      },
      create: {
        eventId,
        minTopupCents: data.minTopupCents,
        maxTopupCents: data.maxTopupCents,
        maxWalletBalance: data.maxBalanceCents,
        refundDeadlineDays: data.refundMaxDays,
        isEnabled: true,
      },
      select: {
        id: true,
        eventId: true,
        minTopupCents: true,
        maxTopupCents: true,
        maxWalletBalance: true,
        refundDeadlineDays: true,
        isEnabled: true,
        createdAt: true,
      },
    });

    // Limpar cache
    await redis.del(`cashless:config:${eventId}`);

    return {
      id: config.id,
      eventId: config.eventId,
      minTopupCents: config.minTopupCents,
      maxTopupCents: config.maxTopupCents,
      maxBalanceCents: config.maxWalletBalance,
      paymentMethods: [],
      enableWristbands: false,
      enableCards: true,
      enableMobile: true,
      refundMaxDays: config.refundDeadlineDays,
      isActive: config.isEnabled,
      createdAt: config.createdAt,
    };
  }

  /**
   * Obtém configuração com estatísticas
   */
  async getConfig(eventId: string, includeStats: boolean = false): Promise<CashlessConfig> {
    // Tentar obter do cache
    const cached = await redis.get(`cashless:config:${eventId}`);
    if (cached && !includeStats) {
      return JSON.parse(cached);
    }

    const config = await prisma.cashlessConfig.findUnique({
      where: { eventId },
      select: {
        id: true,
        eventId: true,
        minTopupCents: true,
        maxTopupCents: true,
        maxWalletBalance: true,
        refundDeadlineDays: true,
        isEnabled: true,
        createdAt: true,
      },
    });

    if (!config) {
      throw new NotFoundError('Configuração de cashless não encontrada');
    }

    const result: CashlessConfig = {
      id: config.id,
      eventId: config.eventId,
      minTopupCents: config.minTopupCents,
      maxTopupCents: config.maxTopupCents,
      maxBalanceCents: config.maxWalletBalance,
      paymentMethods: [],
      enableWristbands: false,
      enableCards: true,
      enableMobile: true,
      refundMaxDays: config.refundDeadlineDays,
      isActive: config.isEnabled,
      createdAt: config.createdAt,
    };

    if (includeStats) {
      // Contar carteiras e volume
      const [walletCount, volumeData] = await Promise.all([
        prisma.cashlessWallet.count({
          where: { eventId, status: 'wallet_active' },
        }),
        prisma.cashlessTransaction.aggregate({
          where: { wallet: { eventId } },
          _sum: { amountCents: true },
        }),
      ]);

      result.walletCount = walletCount;
      result.totalVolumeCents = volumeData._sum.amountCents || 0;
    }

    // Cachear por 1 hora
    if (!includeStats) {
      await redis.setex(`cashless:config:${eventId}`, this.CACHE_TTL, JSON.stringify(result));
    }

    return result;
  }

  /**
   * Atualiza configuração
   */
  async updateConfig(
    eventId: string,
    userId: string,
    data: UpdateCashlessConfigInput,
  ): Promise<CashlessConfig> {
    // Validar propriedade
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { producerId: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Apenas o produtor do evento pode atualizar configurações');
    }

    const config = await prisma.cashlessConfig.update({
      where: { eventId },
      data: {
        ...(data.minTopupCents !== undefined && { minTopupCents: data.minTopupCents }),
        ...(data.maxTopupCents !== undefined && { maxTopupCents: data.maxTopupCents }),
        ...(data.maxBalanceCents !== undefined && { maxWalletBalance: data.maxBalanceCents }),
        ...(data.refundMaxDays !== undefined && { refundDeadlineDays: data.refundMaxDays }),
      },
      select: {
        id: true,
        eventId: true,
        minTopupCents: true,
        maxTopupCents: true,
        maxWalletBalance: true,
        refundDeadlineDays: true,
        isEnabled: true,
        createdAt: true,
      },
    });

    // Limpar cache
    await redis.del(`cashless:config:${eventId}`);

    return {
      id: config.id,
      eventId: config.eventId,
      minTopupCents: config.minTopupCents,
      maxTopupCents: config.maxTopupCents,
      maxBalanceCents: config.maxWalletBalance,
      paymentMethods: [],
      enableWristbands: false,
      enableCards: true,
      enableMobile: true,
      refundMaxDays: config.refundDeadlineDays,
      isActive: config.isEnabled,
      createdAt: config.createdAt,
    };
  }

  /**
   * Obtém dashboard com estatísticas de cashless
   */
  async getDashboard(
    eventId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<DashboardStats> {
    // Validar propriedade
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { producerId: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Apenas o produtor pode acessar o dashboard');
    }

    const dateFilter = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };

    const [totalWallets, activeWallets, transactions, topupData, spentData, refundData] =
      await Promise.all([
        prisma.cashlessWallet.count({
          where: { eventId },
        }),
        prisma.cashlessWallet.count({
          where: { eventId, status: 'wallet_active' },
        }),
        prisma.cashlessTransaction.count({
          where: {
            wallet: { eventId },
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          },
        }),
        prisma.cashlessTransaction.aggregate({
          where: {
            wallet: { eventId },
            type: 'topup',
            status: 'tx_completed',
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          },
          _sum: { amountCents: true },
        }),
        prisma.cashlessTransaction.aggregate({
          where: {
            wallet: { eventId },
            type: 'purchase',
            status: 'tx_completed',
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          },
          _sum: { amountCents: true },
        }),
        prisma.cashlessTransaction.aggregate({
          where: {
            wallet: { eventId },
            type: 'cashless_refund',
            status: 'tx_completed',
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          },
          _sum: { amountCents: true },
        }),
      ]);

    // Calcular saldo médio
    const wallets = await prisma.cashlessWallet.aggregate({
      where: { eventId },
      _avg: { balanceCents: true },
    });

    return {
      totalWallets,
      activeWallets,
      totalTopupsCents: topupData._sum.amountCents || 0,
      totalSpentCents: spentData._sum.amountCents || 0,
      avgBalanceCents: Math.round(wallets._avg.balanceCents || 0),
      totalRefundsCents: refundData._sum.amountCents || 0,
      transactionCount: transactions,
    };
  }

  /**
   * Obtém produtos mais vendidos
   */
  async getTopProducts(
    eventId: string,
    userId: string,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TopProduct[]> {
    // Validar propriedade
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { producerId: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Apenas o produtor pode acessar relatórios');
    }

    const dateFilter = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };

    // Buscar transações e processar
    const transactions = await prisma.cashlessTransaction.findMany({
      where: {
        wallet: { eventId },
        type: 'purchase',
        status: 'tx_completed',
        items: { not: undefined },
        ...(startDate || endDate ? { createdAt: dateFilter } : {}),
      },
      select: {
        items: true,
      },
    });

    // Agregar dados dos itens
    const products: Record<
      string,
      { productId: string; name: string; totalQty: number; totalRevenueCents: number }
    > = {};

    transactions.forEach((tx) => {
      if (tx.items && Array.isArray(tx.items)) {
        (tx.items as any[]).forEach((item) => {
          if (!products[item.productId]) {
            products[item.productId] = {
              productId: item.productId,
              name: item.name,
              totalQty: 0,
              totalRevenueCents: 0,
            };
          }
          products[item.productId].totalQty += item.qty;
          products[item.productId].totalRevenueCents += item.priceCents * item.qty;
        });
      }
    });

    // Ordenar e retornar top N
    return Object.values(products)
      .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)
      .slice(0, limit);
  }

  /**
   * Obtém estatísticas por hora
   */
  async getHourlyStats(
    eventId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<HourlyStats[]> {
    // Validar propriedade
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { producerId: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Apenas o produtor pode acessar relatórios');
    }

    const dateFilter = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };

    // Buscar transações agrupadas por hora
    const transactions = await prisma.cashlessTransaction.findMany({
      where: {
        wallet: { eventId },
        status: 'tx_completed',
        ...(startDate || endDate ? { createdAt: dateFilter } : {}),
      },
      select: {
        amountCents: true,
        walletId: true,
        createdAt: true,
      },
    });

    // Agrupar por hora
    const hourlyData: Record<
      number,
      { transactionCount: number; totalAmountCents: number; uniqueWallets: Set<string> }
    > = {};

    transactions.forEach((tx) => {
      const hour = tx.createdAt.getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { transactionCount: 0, totalAmountCents: 0, uniqueWallets: new Set() };
      }
      hourlyData[hour].transactionCount += 1;
      hourlyData[hour].totalAmountCents += tx.amountCents;
      hourlyData[hour].uniqueWallets.add(tx.walletId);
    });

    // Formatar resposta
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      transactionCount: hourlyData[i]?.transactionCount || 0,
      totalAmountCents: hourlyData[i]?.totalAmountCents || 0,
      uniqueWallets: hourlyData[i]?.uniqueWallets.size || 0,
    }));
  }

  /**
   * Obtém receita agrupada por ponto de venda (PDV)
   * Inclui transações sem POS associado (vendas em app, recargas) sob "Sem PDV"
   */
  async getRevenueByPos(
    eventId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PosRevenue[]> {
    // Validar propriedade do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { producerId: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Apenas o produtor pode acessar relatórios');
    }

    const dateFilter = {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    };

    // Buscar transações concluídas do evento
    const transactions = await prisma.cashlessTransaction.findMany({
      where: {
        wallet: { eventId },
        status: 'tx_completed',
        ...(startDate || endDate ? { createdAt: dateFilter } : {}),
      },
      select: {
        amountCents: true,
        tipCents: true,
        walletId: true,
        posId: true,
        pos: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    // Agrupar por POS
    type PosAggregation = {
      posId: string | null;
      posName: string;
      posLocation: string | null;
      transactionCount: number;
      totalAmountCents: number;
      totalTipsCents: number;
      uniqueWallets: Set<string>;
    };

    const grouped = new Map<string, PosAggregation>();

    for (const tx of transactions) {
      const key = tx.posId ?? '__nopos__';
      const existing = grouped.get(key);

      if (existing) {
        existing.transactionCount += 1;
        existing.totalAmountCents += tx.amountCents;
        existing.totalTipsCents += tx.tipCents;
        existing.uniqueWallets.add(tx.walletId);
      } else {
        grouped.set(key, {
          posId: tx.posId ?? null,
          posName: tx.pos?.name ?? 'Sem PDV',
          posLocation: tx.pos?.location ?? null,
          transactionCount: 1,
          totalAmountCents: tx.amountCents,
          totalTipsCents: tx.tipCents,
          uniqueWallets: new Set([tx.walletId]),
        });
      }
    }

    // Formatar resposta ordenada por receita total desc
    return Array.from(grouped.values())
      .map((g) => ({
        posId: g.posId,
        posName: g.posName,
        posLocation: g.posLocation,
        transactionCount: g.transactionCount,
        totalAmountCents: g.totalAmountCents,
        totalTipsCents: g.totalTipsCents,
        uniqueWallets: g.uniqueWallets.size,
        averageTicketCents:
          g.transactionCount > 0 ? Math.round(g.totalAmountCents / g.transactionCount) : 0,
      }))
      .sort((a, b) => b.totalAmountCents - a.totalAmountCents);
  }
}

export const cashlessService = new CashlessService();
