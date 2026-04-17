import { Request, Response } from 'express';
import { LiveService } from './live.service';

/**
 * Controllers para o módulo de live/social proof
 */

/**
 * GET /live/purchases/:eventId
 * Obtém compras recentes para prova social em página de evento
 */
export const getEventPurchases = async (req: Request, res: Response): Promise<void> => {
  const eventId = req.params.eventId as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  const purchases = await LiveService.getRecentPurchases(eventId, limit);

  res.json({
    success: true,
    data: purchases,
  });
};

/**
 * GET /live/purchases
 * Obtém compras recentes globais para a home page
 */
export const getGlobalPurchases = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

  const purchases = await LiveService.getRecentPurchases(undefined, limit);

  res.json({
    success: true,
    data: purchases,
  });
};

/**
 * GET /live/viewers/:eventId
 * Obtém contagem de visualizadores online
 */
export const getEventViewerCount = async (req: Request, res: Response): Promise<void> => {
  const eventId = req.params.eventId as string;

  const viewerCount = await LiveService.getOnlineViewerCount(eventId);

  res.json({
    success: true,
    data: {
      eventId,
      viewerCount,
    },
  });
};

/**
 * GET /live/stats/:eventId
 * Obtém estatísticas completas em tempo real
 */
export const getEventLiveStats = async (req: Request, res: Response): Promise<void> => {
  const eventId = req.params.eventId as string;

  const stats = await LiveService.getEventLiveStats(eventId);

  res.json({
    success: true,
    data: stats,
  });
};
