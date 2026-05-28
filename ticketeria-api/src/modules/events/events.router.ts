import { Router } from 'express';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createEvent,
  updateEvent,
  getEvent,
  getEventBySlug,
  searchEvents,
  getWeekendEvents,
  getTrendingEvents,
  publishEvent,
  cancelEvent,
  getProducerEvents,
  searchNearby,
  getRecommendations,
} from './events.controller';
import {
  createEventSchema,
  updateEventSchema,
  searchEventsSchema,
  eventIdParamSchema,
  nearbySchema,
} from './events.validators';

/**
 * Router para rotas de eventos
 */
const router = Router();

/**
 * Rotas públicas
 */

// GET /events/nearby
router.get('/nearby', optionalAuth, validate({ query: nearbySchema }), searchNearby);

// GET /events/search
router.get('/search', optionalAuth, validate({ query: searchEventsSchema }), searchEvents);

// GET /events/weekend
router.get('/weekend', optionalAuth, getWeekendEvents);

// GET /events/trending
router.get('/trending', optionalAuth, getTrendingEvents);

// GET /events/slug/:slug
router.get('/slug/:slug', optionalAuth, getEventBySlug);

/**
 * Rotas autenticadas (usuário)
 * IMPORTANTE: rotas literais ('/recommendations') devem vir ANTES de '/:id'
 * para não serem capturadas pelo wildcard.
 */

// GET /events/recommendations
router.get('/recommendations', authenticate, getRecommendations);

// GET /events/:id
router.get('/:id', optionalAuth, validate({ params: eventIdParamSchema }), getEvent);

/**
 * Rotas autenticadas (produtor)
 */

// POST /events
router.post(
  '/',
  authenticate,
  authorize('producer'),
  validate({ body: createEventSchema }),
  createEvent
);

// PATCH /events/:id
router.patch(
  '/:id',
  authenticate,
  authorize('producer'),
  validate({ params: eventIdParamSchema, body: updateEventSchema }),
  updateEvent
);

// POST /events/:id/publish
router.post('/:id/publish', authenticate, authorize('producer'), validate({ params: eventIdParamSchema }), publishEvent);

// POST /events/:id/cancel
router.post('/:id/cancel', authenticate, authorize('producer'), validate({ params: eventIdParamSchema }), cancelEvent);

// GET /events/producer/mine
router.get('/producer/mine', authenticate, authorize('producer'), getProducerEvents);

export default router;
