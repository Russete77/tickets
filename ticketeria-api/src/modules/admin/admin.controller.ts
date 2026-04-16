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
    req: Request<unknown, unknown, unknown, ListEventsInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const pagination = req.query as ListEventsInput;
      const filters = pagination.status ? { status: pagination.status as unknown as string } : undefined;

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
    req: Request<EventIdParam, unknown, ModerateEventInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const { id: eventId } = req.params;
      const { action, reason } = req.body;

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
    req: Request<unknown, unknown, unknown, ListUsersInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const pagination = req.query as ListUsersInput;
      const filters = pagination.role ? { role: pagination.role as unknown as string } : undefined;

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
    req: Request<UserIdParam, unknown, ManageUserInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const { id: userId } = req.params;
      const { action, reason } = req.body;

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
