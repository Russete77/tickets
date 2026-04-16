import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { toggleFavorite, getMyFavorites, checkFavorited } from './favorites.controller';
import { eventIdParamSchema, paginationSchema } from './favorites.validators';

/**
 * Router para rotas de favoritos
 */
export const favoritesRouter = Router();

/**
 * Todas as rotas de favoritos requerem autenticação
 */

// POST /favorites/:eventId/toggle
// Ativa ou desativa favorito para um evento
favoritesRouter.post(
  '/:eventId/toggle',
  authenticate,
  validate({ params: eventIdParamSchema }),
  toggleFavorite,
);

// GET /favorites
// Obtém todos os favoritos do usuário
favoritesRouter.get('/', authenticate, validate({ query: paginationSchema }, getMyFavorites));

// GET /favorites/:eventId/check
// Verifica se um evento é favorito do usuário
favoritesRouter.get(
  '/:eventId/check',
  authenticate,
  validate({ params: eventIdParamSchema }),
  checkFavorited,
);

export default favoritesRouter;
