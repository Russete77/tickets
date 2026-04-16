import { Request, Response, NextFunction } from 'express';
import { affiliatesService } from './affiliates.service';
import { CreateLinkInput, GetAffiliateStatsInput } from './affiliates.validators';

/**
 * Controladores para gerenciamento de afiliados
 */

export class AffiliatesController {
  /**
   * POST /affiliates/links
   * Criar novo link de afiliado
   */
  static async createLink(
    req: Request<unknown, unknown, CreateLinkInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { eventId, commissionPercent } = req.body;

      const link = await affiliatesService.createLink(userId, eventId, commissionPercent);

      res.status(201).json({
        success: true,
        data: link,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /affiliates/links
   * Listar links de afiliado do usuário
   */
  static async getMyLinks(
    req: Request<unknown, unknown, unknown, GetAffiliateStatsInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const pagination = req.query as GetAffiliateStatsInput;

      const result = await affiliatesService.getMyLinks(userId, pagination);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /affiliates/dashboard
   * Obter dashboard do afiliado
   */
  static async getDashboard(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;

      const dashboard = await affiliatesService.getDashboard(userId);

      res.status(200).json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /affiliates/track/:code
   * Rastrear clique em link de afiliado (público, redireciona)
   */
  static async trackClick(
    req: Request<{ code: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { code } = req.params;

      // Rastrear clique
      await affiliatesService.trackClick(code);

      // Buscar o link para redirecionar
      const link = await affiliatesService.getByCode(code);

      if (!link) {
        return res.status(404).json({
          success: false,
          message: 'Link de afiliado não encontrado',
        });
      }

      // Redirecionar para a página do evento
      res.redirect(`/events/${link.eventId}`);
    } catch (error) {
      next(error);
    }
  }
}
