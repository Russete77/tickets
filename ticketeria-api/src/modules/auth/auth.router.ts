import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  verify2faSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validators';

const router = Router();

/**
 * POST /auth/register
 * Registrar novo usuário
 */
router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  AuthController.register
);

/**
 * POST /auth/login
 * Realizar login
 */
router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  AuthController.login
);

/**
 * POST /auth/verify-2fa
 * Verificar código 2FA (TOTP)
 */
router.post(
  '/verify-2fa',
  authRateLimiter,
  optionalAuth,
  validate({ body: verify2faSchema }),
  AuthController.verify2fa
);

/**
 * POST /auth/refresh
 * Atualizar access token usando refresh token
 */
router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  AuthController.refreshToken
);

/**
 * POST /auth/verify-email
 * Verificar endereço de email
 */
router.post(
  '/verify-email',
  authenticate,
  validate({ body: verifyEmailSchema }),
  AuthController.verifyEmail
);

/**
 * POST /auth/forgot-password
 * Solicitar reset de senha
 */
router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  AuthController.forgotPassword
);

/**
 * POST /auth/reset-password
 * Resetar senha
 */
router.post(
  '/reset-password',
  authenticate,
  validate({ body: resetPasswordSchema }),
  AuthController.resetPassword
);

/**
 * POST /auth/enable-2fa
 * Solicitar habilitação de 2FA
 */
router.post(
  '/enable-2fa',
  authenticate,
  AuthController.enable2FA
);

/**
 * POST /auth/confirm-2fa
 * Confirmar 2FA após scannear QR code
 */
router.post(
  '/confirm-2fa',
  authenticate,
  validate({ body: verify2faSchema }),
  AuthController.confirm2FA
);

/**
 * POST /auth/disable-2fa
 * Desabilitar 2FA
 */
router.post(
  '/disable-2fa',
  authenticate,
  validate({ body: { password: require('zod').z.string() } }),
  AuthController.disable2FA
);

export const authRouter = router;
