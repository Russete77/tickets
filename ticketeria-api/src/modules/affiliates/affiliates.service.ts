import crypto from 'crypto';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { buildCursorPagination, formatPaginatedResponse, type PaginatedResponse } from '../../shared/pagination';
import { GetAffiliateStatsInput } from './affiliates.validators';

interface AffiliateLink {
  id: string;
  code: string;
  eventId: string;
  userId: string;
  clickCount: number;
  conversionCount: number;
  commissionPercent: number;
  createdAt: Date;
}

interface AffiliateDashboard {
  totalClicks: number;
  totalConversions: number;
  totalCommissionEarned: number;
  linksCount: number;
}

/**
 * Serviço de gerenciamento de afiliados
 */
export class AffiliatesService {
  /**
   * Cria um novo link de afiliado com código único
   */
  async createLink(
    userId: string,
    eventId: string,
    commissionPercent: number,
  ): Promise<AffiliateLink> {
    // Verificar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Gerar código único de afiliado
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      code = crypto.randomBytes(6).toString('base64url').substring(0, 8).toUpperCase();
      const existing = await prisma.affiliateLink.findUnique({
        where: { code },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new ConflictError('Erro ao gerar código de afiliado único');
    }

    // Criar link de afiliado
    const affiliateLink = await prisma.affiliateLink.create({
      data: {
        code,
        eventId,
        userId,
        commissionPercent,
      },
    });

    return {
      id: affiliateLink.id,
      code: affiliateLink.code,
      eventId: affiliateLink.eventId,
      userId: affiliateLink.userId,
      clickCount: affiliateLink.clickCount,
      conversionCount: affiliateLink.conversionCount,
      commissionPercent: Number(affiliateLink.commissionPercent),
      createdAt: affiliateLink.createdAt,
    };
  }

  /**
   * Obtém os links de afiliado de um usuário com paginação
   */
  async getMyLinks(
    userId: string,
    pagination: GetAffiliateStatsInput,
  ): Promise<PaginatedResponse<AffiliateLink>> {
    const paginationParams = buildCursorPagination(pagination);

    const links = await prisma.affiliateLink.findMany({
      where: { userId },
      ...paginationParams,
    });

    const formattedLinks = links.map((link) => ({
      id: link.id,
      code: link.code,
      eventId: link.eventId,
      userId: link.userId,
      clickCount: link.clickCount,
      conversionCount: link.conversionCount,
      commissionPercent: Number(link.commissionPercent),
      createdAt: link.createdAt,
    }));

    return formatPaginatedResponse(formattedLinks, pagination.limit);
  }

  /**
   * Obtém o dashboard de afiliado com resumo de estatísticas
   */
  async getDashboard(userId: string): Promise<AffiliateDashboard> {
    const links = await prisma.affiliateLink.findMany({
      where: { userId },
    });

    const totalClicks = links.reduce((sum, link) => sum + link.clickCount, 0);
    const totalConversions = links.reduce((sum, link) => sum + link.conversionCount, 0);

    // Calcular comissão total baseado em conversões
    let totalCommissionEarned = 0;
    for (const link of links) {
      // Buscar orders que usaram este código de afiliado
      const orders = await prisma.order.findMany({
        where: {
          eventId: link.eventId,
          // Nota: aqui seria necessário ter um campo no Order para rastrear affiliateCode
          // Por enquanto, apenas somamos baseado no conversionCount
        },
      });

      const conversionRevenue = link.conversionCount * 100; // Valor base em centavos
      totalCommissionEarned += Math.round(conversionRevenue * (Number(link.commissionPercent) / 100));
    }

    return {
      totalClicks,
      totalConversions,
      totalCommissionEarned,
      linksCount: links.length,
    };
  }

  /**
   * Rastreia um clique em um link de afiliado (atômico via Redis)
   */
  async trackClick(code: string): Promise<void> {
    const redisKey = `affiliate:click:${code}`;

    // Incrementar contador no Redis de forma atômica
    await redis.incr(redisKey);

    // Definir expiração em 24 horas se não existir
    await redis.expire(redisKey, 24 * 60 * 60);
  }

  /**
   * Obtém um link de afiliado pelo código
   */
  async getByCode(code: string): Promise<AffiliateLink | null> {
    const link = await prisma.affiliateLink.findUnique({
      where: { code },
    });

    if (!link) {
      return null;
    }

    return {
      id: link.id,
      code: link.code,
      eventId: link.eventId,
      userId: link.userId,
      clickCount: link.clickCount,
      conversionCount: link.conversionCount,
      commissionPercent: Number(link.commissionPercent),
      createdAt: link.createdAt,
    };
  }

  /**
   * Sincroniza cliques do Redis para o banco de dados
   * (Deve ser chamado periodicamente via job)
   */
  async syncClicksFromRedis(code: string): Promise<void> {
    const redisKey = `affiliate:click:${code}`;
    const clicks = await redis.get(redisKey);

    if (clicks) {
      const clickCount = parseInt(clicks, 10);
      await prisma.affiliateLink.update({
        where: { code },
        data: { clickCount: { increment: clickCount } },
      });

      // Limpar o contador do Redis após sincronizar
      await redis.del(redisKey);
    }
  }
}

export const affiliatesService = new AffiliatesService();
