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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const eventId = req.params.eventId as string;

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const eventId = req.params.eventId as string;
      const pagination = req.query as unknown as ListCourtesiesInput;

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { id } = req.params;

      const courtesy = await courtesiesService.approveCourtesy(id as string, userId, userRole);

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { id } = req.params;

      const courtesy = await courtesiesService.rejectCourtesy(id as string, userId, userRole);

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { id } = req.params;

      const courtesy = await courtesiesService.revokeCourtesy(id as string, userId, userRole);

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const eventId = req.params.eventId as string;

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
