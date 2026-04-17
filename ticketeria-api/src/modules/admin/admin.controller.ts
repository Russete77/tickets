import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import {
  ModerateEventInput,
  ManageUserInput,
  ListEventsInput,
  ListUsersInput,
  EventIdParam,
  UserIdParam,
} from './admin.validators';

/**
 * Controladores para administração
 */

export class AdminController {
  /**
   * GET /admin/dashboard
   * Obter estatísticas do dashboard
   */
  static async getDashboard(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/events
   * Listar eventos com paginação
   */
  static async listEvents(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const pagination = req.query as unknown as ListEventsInput;
      const filters = pagination.status ? { status: pagination.status as any } : undefined;

      const result = await adminService.listEvents(filters, pagination);

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
   * PATCH /admin/events/:id/moderate
   * Moderar evento
   */
  static async moderateEvent(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const eventId = req.params.id as string;
      const { action, reason } = req.body as ModerateEventInput;

      const event = await adminService.moderateEvent(eventId, action, reason, adminId);

      res.status(200).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/users
   * Listar usuários com paginação
   */
  static async listUsers(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const pagination = req.query as unknown as ListUsersInput;
      const filters = pagination.role ? { role: pagination.role as any } : undefined;

      const result = await adminService.listUsers(filters, pagination);

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
   * PATCH /admin/users/:id/manage
   * Gerenciar usuário
   */
  static async manageUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const userId = req.params.id as string;
      const { action, reason } = req.body as ManageUserInput;

      const user = await adminService.manageUser(userId, action, reason, adminId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
