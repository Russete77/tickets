import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import {
  RegisterInput,
  LoginInput,
  Verify2faInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.validators';

/**
 * Controladores para autenticação
 */

export class AuthController {
  /**
   * POST /auth/register
   */
  static async register(
    req: Request<unknown, unknown, RegisterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { user, tokens } = await authService.register(req.body);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            cpf: user.cpf,
            phone: user.phone,
            emailVerified: user.emailVerified,
            role: user.role,
          },
          tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/login
   */
  static async login(
    req: Request<unknown, unknown, LoginInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { user, tokens } = await authService.login(req.body.email, req.body.password);

      // Se 2FA está ativado, o accessToken é um token temporário
      if (tokens.refreshToken === '') {
        res.status(200).json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              totpEnabled: user.totpEnabled,
            },
            message: '2FA requerido',
            accessToken: tokens.accessToken,
          },
        });
      } else {
        res.status(200).json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              cpf: user.cpf,
              phone: user.phone,
              emailVerified: user.emailVerified,
              role: user.role,
            },
            tokens,
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/verify-2fa
   */
  static async verify2fa(
    req: Request<unknown, unknown, Verify2faInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token 2FA não fornecido',
          },
        });
        return;
      }

      const { user, tokens } = await authService.verify2FA(req.user.userId, req.body.code);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            cpf: user.cpf,
            phone: user.phone,
            emailVerified: user.emailVerified,
            role: user.role,
          },
          tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   */
  static async refreshToken(
    req: Request<unknown, unknown, RefreshTokenInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tokens = await authService.refreshToken(req.body.refreshToken);

      res.status(200).json({
        success: true,
        data: { tokens },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/verify-email
   */
  static async verifyEmail(
    req: Request<unknown, unknown, VerifyEmailInput>,
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

      const user = await authService.verifyEmail(req.user.userId, req.body.token);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/forgot-password
   */
  static async forgotPassword(
    req: Request<unknown, unknown, ForgotPasswordInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await authService.forgotPassword(req.body.email);

      // Sempre retornar sucesso (não revelar se email existe)
      res.status(200).json({
        success: true,
        data: {
          message: 'Se o email estiver cadastrado, você receberá um link de reset de senha',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/reset-password
   */
  static async resetPassword(
    req: Request<unknown, unknown, ResetPasswordInput>,
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

      const user = await authService.resetPassword(
        req.user.userId,
        req.body.token,
        req.body.newPassword
      );

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/enable-2fa
   */
  static async enable2FA(
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

      const { secret, qrCode } = await authService.enable2FA(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          secret,
          qrCode,
          message: 'Escaneie o código QR com seu app de autenticação',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/confirm-2fa
   */
  static async confirm2FA(
    req: Request<unknown, unknown, Verify2faInput>,
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

      const user = await authService.confirm2FA(req.user.userId, req.body.code);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            totpEnabled: user.totpEnabled,
          },
          message: '2FA ativado com sucesso',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/disable-2fa
   */
  static async disable2FA(
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

      const user = await authService.disable2FA(req.user.userId, req.body.password);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            totpEnabled: user.totpEnabled,
          },
          message: '2FA desativado com sucesso',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
