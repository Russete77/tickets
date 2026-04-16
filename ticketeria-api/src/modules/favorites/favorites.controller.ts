import { Request, Response } from 'express';
import { FavoritesService } from './favorites.service';
import { EventIdParam, PaginationInput } from './favorites.validators';

/**
 * Controllers para o módulo de favoritos
 */

const favoritesService = new FavoritesService();

/**
 * POST /favorites/:eventId/toggle
 * Ativa ou desativa favorito para um evento
 */
export const toggleFavorite = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { eventId } = req.params as EventIdParam;

  const result = await favoritesService.toggleFavorite(userId, eventId);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /favorites
 * Obtém todos os favoritos do usuário autenticado
 */
export const getMyFavorites = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const pagination = req.query as unknown as PaginationInput;

  const result = await favoritesService.getMyFavorites(userId, {
    cursor: pagination.cursor,
    limit: pagination.limit,
  });

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /favorites/:eventId/check
 * Verifica se um evento é favorito do usuário
 */
export const checkFavorited = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { eventId } = req.params as EventIdParam;

  const isFavorited = await favoritesService.isFavorited(userId, eventId);

  res.json({
    success: true,
    data: {
      isFavorited,
    },
  });
};
