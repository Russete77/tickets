import { Request, Response, NextFunction } from 'express';
import { waitlistService } from './waitlist.service';
import {
  JoinWaitlistInput,
  ListWaitlistInput,
  EventIdParams,
} from './waitlist.validators';

/**
 * Controladores para gerenciamento de waitlist
 */

export class WaitlistController {
  /**
   * POST /waitlist/:eventId
   * Entrar na waitlist
   */
  static async joinWaitlist(
    req: Request<EventIdParams, unknown, JoinWaitlistInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userEmail = req.user!.email;
      const { eventId } = req.params;

      const entry = await waitlistService.joinWaitlist(
        eventId,
        userId,
        userEmail,
        req.body,
      );

      res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /waitlist/:eventId
   * Sair da waitlist
   */
  static async leaveWaitlist(
    req: Request<EventIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { eventId } = req.params;

      await waitlistService.leaveWaitlist(eventId, userId);

      res.status(200).json({
        success: true,
        message: 'Removido da waitlist com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /waitlist/:eventId
   * Listar waitlist (produtor)
   */
  static async getWaitlist(
    req: Request<EventIdParams, unknown, unknown, ListWaitlistInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const { eventId } = req.params;
      const pagination = req.query as ListWaitlistInput;

      const result = await waitlistService.getWaitlist(
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
   * GET /waitlist/:eventId/count
   * Contagem pública de waitlist
   */
  static async getCount(
    req: Request<EventIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      const count = await waitlistService.getCount(eventId);

      res.status(200).json({
        success: true,
        data: count,
      });
    } catch (error) {
      next(error);
    }
  }
}
