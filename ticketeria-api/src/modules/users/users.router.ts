import { Router } from 'express';
import { z } from 'zod';
import { UsersController } from './users.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { lgpdRateLimiter } from '../../middleware/rateLimiter';
import {
  updateProfileSchema,
  changePasswordSchema,
  paginationSchema,
  consentSchema,
  pushTokenSchema,
} from './users.validators';

const router = Router();

// Todos as rotas requerem autenticação
router.use(authenticate);

/**
 * GET /users/me
 * Obter perfil do usuário autenticado
 */
router.get(
  '/me',
  UsersController.getProfile);

/**
 * PATCH /users/me
 * Atualizar perfil do usuário
 */
router.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  UsersController.updateProfile);

/**
 * POST /users/me/change-password
 * Alterar senha do usuário
 */
router.post(
  '/me/change-password',
  validate({ body: changePasswordSchema }),
  UsersController.changePassword);

/**
 * GET /users/me/orders
 * Obter histórico de pedidos
 */
router.get(
  '/me/orders',
  validate({ query: paginationSchema }),
  UsersController.getOrderHistory);

/**
 * GET /users/me/data
 * Exportar dados do usuário (LGPD - direito de portabilidade, art. 18 IV)
 */
router.get(
  '/me/data',
  lgpdRateLimiter,
  UsersController.exportData);

/**
 * DELETE /users/me
 * Deletar conta do usuário (LGPD - direito ao apagamento, art. 18 VI)
 */
router.delete(
  '/me',
  lgpdRateLimiter,
  validate({ body: z.object({ password: z.string().min(1, 'Senha é obrigatória') }) }),
  UsersController.deleteAccount);

/**
 * POST /users/me/consent
 * Registrar consentimento
 */
router.post(
  '/me/consent',
  validate({ body: consentSchema }),
  UsersController.recordConsent);

/**
 * PUT /users/push-token
 * Salvar Expo push token do dispositivo
 */
router.put(
  '/push-token',
  validate({ body: pushTokenSchema }),
  UsersController.updatePushToken);

export const usersRouter = router;
