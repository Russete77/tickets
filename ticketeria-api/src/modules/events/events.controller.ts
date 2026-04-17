import { Request, Response } from 'express';
import { EventsService } from './events.service';
import { SearchService } from './search.service';
import { CreateEventInput, UpdateEventInput, SearchEventsInput, NearbyInput } from './events.validators';

/**
 * Controllers para o módulo de eventos
 */

// EventsService uses static methods
const searchService = new SearchService();

/**
 * POST /events
 * Cria um novo evento
 */
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  const producerId = req.user!.userId;
  const data = req.body as CreateEventInput;

  const event = await EventsService.create(producerId, data);

  res.status(201).json({
    success: true,
    data: event,
  });
};

/**
 * PATCH /events/:id
 * Atualiza um evento
 */
export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  const producerId = req.user!.userId;
  const eventId = req.params.id as string;
  const data = req.body as UpdateEventInput;

  const event = await EventsService.update(eventId, producerId, data);

  res.json({
    success: true,
    data: event,
  });
};

/**
 * GET /events/:id
 * Obtém evento por ID
 */
export const getEvent = async (req: Request, res: Response): Promise<void> => {
  const eventId = req.params.id as string;

  const event = await EventsService.getById(eventId);

  res.json({
    success: true,
    data: event,
  });
};

/**
 * GET /events/slug/:slug
 * Obtém evento pela slug (página pública)
 */
export const getEventBySlug = async (req: Request, res: Response): Promise<void> => {
  const slug = req.params.slug as string;

  const event = await EventsService.getBySlug(slug);

  res.json({
    success: true,
    data: event,
  });
};

/**
 * GET /events/search
 * Busca eventos com filtros
 */
export const searchEvents = async (req: Request, res: Response): Promise<void> => {
  const filters = req.query as unknown as SearchEventsInput;

  const result = await EventsService.search(filters);

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /events/weekend
 * Obtém eventos deste fim de semana
 */
export const getWeekendEvents = async (req: Request, res: Response): Promise<void> => {
  const events = await EventsService.getWeekendEvents();

  res.json({
    success: true,
    data: events,
  });
};

/**
 * GET /events/trending
 * Obtém eventos mais vendidos
 */
export const getTrendingEvents = async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 10;

  const events = await EventsService.getTrendingEvents(limit);

  res.json({
    success: true,
    data: events,
  });
};

/**
 * POST /events/:id/publish
 * Publica um evento
 */
export const publishEvent = async (req: Request, res: Response): Promise<void> => {
  const producerId = req.user!.userId;
  const eventId = req.params.id as string;

  const event = await EventsService.publish(eventId, producerId);

  res.json({
    success: true,
    data: event,
  });
};

/**
 * POST /events/:id/cancel
 * Cancela um evento
 */
export const cancelEvent = async (req: Request, res: Response): Promise<void> => {
  const producerId = req.user!.userId;
  const eventId = req.params.id as string;

  const event = await EventsService.cancel(eventId, producerId);

  res.json({
    success: true,
    data: event,
  });
};

/**
 * GET /events/producer/mine
 * Obtém eventos do produtor logado
 */
export const getProducerEvents = async (req: Request, res: Response): Promise<void> => {
  const producerId = req.user!.userId;
  const cursor = req.query.cursor as string | undefined;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await EventsService.getProducerEvents(producerId, { cursor, limit });

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /events/nearby
 * Busca eventos próximos com geolocalização
 */
export const searchNearby = async (req: Request, res: Response): Promise<void> => {
  const filters = req.query as unknown as NearbyInput;

  const result = await searchService.searchNearby(filters.lat, filters.lng, filters.radius, {
    category: filters.category,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
  });

  res.json({
    success: true,
    data: result,
  });
};

/**
 * GET /events/recommendations
 * Obtém recomendações personalizadas para o usuário
 */
export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const limit = parseInt(req.query.limit as string) || 10;

  const recommendations = await searchService.getRecommendations(userId, limit);

  res.json({
    success: true,
    data: recommendations,
  });
};
