import { Router } from 'express';
import {
  getEventPurchases,
  getGlobalPurchases,
  getEventViewerCount,
  getEventLiveStats,
} from './live.controller';

/**
 * Router para rotas de live/social proof
 * Todas as rotas são públicas (sem autenticação necessária)
 */
export const liveRouter = Router();

/**
 * GET /live/purchases
 * Compras recentes globais (home page)
 */
liveRouter.get('/purchases', getGlobalPurchases);

/**
 * GET /live/purchases/:eventId
 * Compras recentes do evento
 */
liveRouter.get('/purchases/:eventId', getEventPurchases);

/**
 * GET /live/viewers/:eventId
 * Contagem de visualizadores online
 */
liveRouter.get('/viewers/:eventId', getEventViewerCount);

/**
 * GET /live/stats/:eventId
 * Estatísticas combinadas (compras, viewers, capacidade)
 */
liveRouter.get('/stats/:eventId', getEventLiveStats);
