import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AffiliatesController } from './affiliates.controller';
import { createLinkSchema, getAffiliateStatsSchema } from './affiliates.validators';

export const affiliatesRouter = Router();

/**
 * POST /affiliates/links
 * Criar novo link de afiliado (autenticado)
 */
affiliatesRouter.post(
  '/links',
  authenticate,
  validate({ body: createLinkSchema }),
  AffiliatesController.createLink,
);

/**
 * GET /affiliates/links
 * Listar links do usuário (autenticado)
 */
affiliatesRouter.get(
  '/links',
  authenticate,
  validate({ query: getAffiliateStatsSchema }),
  AffiliatesController.getMyLinks,
);

/**
 * GET /affiliates/dashboard
 * Dashboard do afiliado (autenticado)
 */
affiliatesRouter.get(
  '/dashboard',
  authenticate,
  AffiliatesController.getDashboard,
);

/**
 * GET /affiliates/track/:code
 * Rastrear clique em link (público)
 */
affiliatesRouter.get(
  '/track/:code',
  AffiliatesController.trackClick,
);
