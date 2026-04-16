import { Request, Response, NextFunction } from 'express';
import { permissionsService } from './permissions.service';
import {
  GrantPermissionInput,
  UserIdParam,
  EventIdParam,
  IdParam,
  CheckPermissionInput,
} from './permissions.validators';

/**
 * Controladores para gerenciamento de permissões
 */
export class PermissionsController {
  /**
   * POST /permissions
   * Conceder permissão a um usuário
   */
  static async grantPermission(
    req: Request<unknown, unknown, GrantPermissionInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId, eventId, resource, actions } = req.body;

      const permission = await permissionsService.grantPermission({
        userId,
        eventId,
        resource,
        actions,
      });

      res.status(201).json({
        success: true,
        data: permission,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /permissions/user/:userId
   * Listar todas as permissões de um usuário
   */
  static async getUserPermissions(
    req: Request<UserIdParam>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const currentUserId = req.user!.userId;

      const permissions = await permissionsService.getUserPermissions(
        userId,
        currentUserId,
      );

      res.status(200).json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /permissions/event/:eventId
   * Listar todas as permissões de um evento
   */
  static async getEventPermissions(
    req: Request<EventIdParam>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user!.userId;

      const permissions = await permissionsService.getEventPermissions(
        eventId,
        userId,
      );

      res.status(200).json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /permissions/:id
   * Revogar uma permissão
   */
  static async revokePermission(
    req: Request<IdParam>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      await permissionsService.revokePermission(id, userId);

      res.status(200).json({
        success: true,
        data: { id },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /permissions/check
   * Verificar se o usuário atual tem uma permissão específica
   */
  static async checkPermission(
    req: Request<unknown, unknown, unknown, CheckPermissionInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { eventId, resource, action } = req.query as CheckPermissionInput;

      const hasPermission = await permissionsService.checkPermission(
        userId,
        eventId,
        resource,
        action,
      );

      res.status(200).json({
        success: true,
        data: { hasPermission },
      });
    } catch (error) {
      next(error);
    }
  }
}
