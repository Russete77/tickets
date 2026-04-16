import { Request, Response, NextFunction } from 'express';
import { courtesiesService } from './courtesies.service';
import {
  RequestCourtesyInput,
  ListCourtesiesInput,
  CourtesyIdParams,
  EventIdParams,
} from './courtesies.validators';

/**
 * Controladores para gerenciamento de cortesias
 */

export class CourtesiesController {
  /**
   * POST /courtesies/:eventId
   * Solicitar cortesia
   */
  static async requestCourtesy(
    req: Request<EventIdParams, unknown, RequestCourtesyInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { eventId } = req.params;

      const courtesy = await courtesiesService.requestCourtesy(
        eventId,
        userId,
        userRole,
        req.body,
      );

      res.status(201).json({
        success: true,
        data: courtesy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /courtesies/:eventId
   * Listar cortesias com filtros
   */
  static async listCourtesies(
    req: Request<EventIdParams, unknown, unknown, ListCourtesiesInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { eventId } = req.params;
      const pagination = req.query as ListCourtesiesInput;

      const result = await courtesiesService.listCourtesies(
        eventId,
        userId,
        userRole,
        pagination,
      );

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
   * PATCH /courtesies/:id/approve
   * Aprovar cortesia e gerar ingresso
   */
  static async approveCourtesy(
    req: Request<CourtesyIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { id } = req.params;

      const courtesy = await courtesiesService.approveCourtesy(id, userId, userRole);

      res.status(200).json({
        success: true,
        data: courtesy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /courtesies/:id/reject
   * Rejeitar cortesia
   */
  static async rejectCourtesy(
    req: Request<CourtesyIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { id } = req.params;

      const courtesy = await courtesiesService.rejectCourtesy(id, userId, userRole);

      res.status(200).json({
        success: true,
        data: courtesy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /courtesies/:id/revoke
   * Revogar cortesia e cancelar ingresso
   */
  static async revokeCourtesy(
    req: Request<CourtesyIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { id } = req.params;

      const courtesy = await courtesiesService.revokeCourtesy(id, userId, userRole);

      res.status(200).json({
        success: true,
        data: courtesy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /courtesies/:eventId/report
   * Obter relatório de cortesias
   */
  static async getReport(
    req: Request<EventIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { eventId } = req.params;

      const report = await courtesiesService.getReport(eventId, userId, userRole);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}
