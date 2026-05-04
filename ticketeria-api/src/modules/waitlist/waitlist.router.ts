import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { requireEventOwnership } from '../../middleware/eventOwnership';
import { validate } from '../../middleware/validate';
import { WaitlistController } from './waitlist.controller';
import {
  joinWaitlistSchema,
  listWaitlistSchema,
  eventIdParamSchema,
} from './waitlist.validators';

export const waitlistRouter = Router();

/**
 * POST /waitlist/:eventId
 * Entrar na waitlist (autenticado)
 */
waitlistRouter.post(
  '/:eventId',
  authenticate,
  validate({ params: eventIdParamSchema, body: joinWaitlistSchema }),
  WaitlistController.joinWaitlist,
);

/**
 * DELETE /waitlist/:eventId
 * Sair da waitlist (autenticado)
 */
waitlistRouter.delete(
  '/:eventId',
  authenticate,
  validate({ params: eventIdParamSchema }),
  WaitlistController.leaveWaitlist,
);

/**
 * GET /waitlist/:eventId
 * Listar waitlist (autenticado, produtor dono do evento)
 */
waitlistRouter.get(
  '/:eventId',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: eventIdParamSchema, query: listWaitlistSchema }),
  requireEventOwnership,
  WaitlistController.getWaitlist,
);

/**
 * GET /waitlist/:eventId/count
 * Contagem pública de waitlist (público)
 */
waitlistRouter.get(
  '/:eventId/count',
  validate({ params: eventIdParamSchema }),
  WaitlistController.getCount,
);
