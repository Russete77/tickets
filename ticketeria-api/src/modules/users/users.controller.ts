import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import {
  UpdateProfileInput,
  ChangePasswordInput,
  PaginationInput,
  ConsentInput,
} from './users.validators';

/**
 * Controladores para gerenciamento de usuários
 */

export class UsersController {
  /**
   * GET /users/me
   * Obter perfil do usuário autenticado
   */
  static async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Não autenticado',
          },
        });
        return;
      }

      const user = await usersService.getProfile(req.user.userId);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /users/me
   * Atualizar perfil do usuário
   */
  static async updateProfile(
    req: Request<unknown, unknown, UpdateProfileInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Não autenticado',
          },
        });
        return;
      }

      const user = await usersService.updateProfile(req.user.userId, req.body);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /users/me/change-password
   * Alterar senha do usuário
   */
  static async changePassword(
    req: Request<unknown, unknown, ChangePasswordInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Não autenticado',
          },
        });
        return;
      }

      const result = await usersService.changePassword(req.user.userId, req.body);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/me/orders
   * Obter histórico de pedidos
   */
  static async getOrderHistory(
    req: Request<unknown, unknown, unknown, PaginationInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Não autenticado',
          },
        });
        return;
      }

      const pagination: PaginationInput = {
        cursor: req.query.cursor as string | undefined,
        limit: parseInt((req.query.limit as string) || '20'),
        direction: (req.query.direction as 'forward' | 'backward') || 'forward',
      };

      const result = await usersService.getOrderHistory(req.user.userId, pagination);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/me/data
   * Exportar dados do usuário (LGPD)
   */
  static async exportData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Não autenticado',
          },
        });
        return;
      }

      const data = await usersService.exportUserData(req.user.userId);

      // Retornar como JSON
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /users/me
   * Deletar conta do usuário (LGPD)
   */
  static async deleteAccount(
    req: Request<unknown, unknown, { password: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Não autenticado',
          },
        });
        return;
      }

      const result = await usersService.deleteAccount(
        req.user.userId,
        req.body.password
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /users/me/consent
   * Registrar consentimento
   */
  static async recordConsent(
    req: Request<unknown, unknown, ConsentInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Não autenticado',
          },
        });
        return;
      }

      const result = await usersService.recordConsent(req.user.userId, req.body);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
