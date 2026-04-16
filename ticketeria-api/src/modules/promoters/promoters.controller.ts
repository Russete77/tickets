import { Request, Response, NextFunction } from 'express';
import { promotersService } from './promoters.service';
import {
  RegisterPromoterInput,
  ListPromotersInput,
  UpdatePromoterInput,
  AssignToEventInput,
  PromoterIdParams,
  EventIdParams,
} from './promoters.validators';

/**
 * Controladores para gerenciamento de promoters
 */

export class PromotersController {
  /**
   * POST /promoters
   * Registrar novo promoter
   */
  static async register(
    req: Request<unknown, unknown, RegisterPromoterInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { displayName, instagram, whatsapp } = req.body;

      const promoter = await promotersService.register(userId, {
        displayName,
        instagram,
        whatsapp,
      });

      res.status(201).json({
        success: true,
        data: promoter,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /promoters
   * Listar promoters com paginação e busca
   */
  static async list(
    req: Request<unknown, unknown, unknown, ListPromotersInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const pagination = req.query as ListPromotersInput;

      const result = await promotersService.list(pagination);

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
   * GET /promoters/:id
   * Obter promoter por ID com stats
   */
  static async getById(
    req: Request<PromoterIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      const promoter = await promotersService.getById(id);

      res.status(200).json({
        success: true,
        data: promoter,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /promoters/:id
   * Atualizar dados do promoter
   */
  static async update(
    req: Request<PromoterIdParams, unknown, UpdatePromoterInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { displayName, instagram, whatsapp } = req.body;

      const promoter = await promotersService.update(id, userId, {
        displayName,
        instagram,
        whatsapp,
      });

      res.status(200).json({
        success: true,
        data: promoter,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /promoters/:id/assign/:eventId
   * Atribuir promoter a um evento
   */
  static async assignToEvent(
    req: Request<
      PromoterIdParams & EventIdParams,
      unknown,
      AssignToEventInput
    >,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id: promoterId, eventId } = req.params;
      const { maxGuests } = req.body;

      const assignment = await promotersService.assignToEvent(
        promoterId,
        eventId,
        maxGuests,
      );

      res.status(201).json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /promoters/:id/events
   * Obter eventos atribuídos ao promoter
   */
  static async getAssignedEvents(
    req: Request<PromoterIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      const events = await promotersService.getAssignedEvents(id);

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /promoters/me/dashboard
   * Obter dashboard do promoter autenticado
   */
  static async getMyDashboard(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;

      const dashboard = await promotersService.getMyDashboard(userId);

      res.status(200).json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /promoters/me/events/:eventId/stats
   * Obter estatísticas do promoter para um evento
   */
  static async getEventStats(
    req: Request<EventIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { eventId } = req.params;

      // First, get the promoter by userId to get promoterId
      const dashboard = await promotersService.getMyDashboard(userId);
      const promoterId = dashboard.id;

      const stats = await promotersService.getEventStats(promoterId, eventId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
