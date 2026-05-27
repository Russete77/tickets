import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireOrganizationRole } from '../../middleware/organization';
import { validate } from '../../middleware/validate';
import { VenueMapsService } from './venue-maps.service';
import { ZoneOccupancyService } from './zone-occupancy.service';
import { upsertVenueMapSchema, venueMapParamsSchema, orgEventParamsSchema } from './venue-maps.validators';

const router = Router();

/**
 * GET /events/:eventId/map — público autenticado
 */
router.get(
  '/events/:eventId/map',
  authenticate,
  validate({ params: venueMapParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const map = await VenueMapsService.getByEvent(req.params.eventId as string);
      res.json({ success: true, data: map });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /events/:eventId/zones/occupancy — snapshot atual da ocupação
 */
router.get(
  '/events/:eventId/zones/occupancy',
  authenticate,
  validate({ params: venueMapParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await ZoneOccupancyService.computeForEvent(req.params.eventId as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PUT /orgs/:organizationId/events/:eventId/venue-map — admin upsert
 */
router.put(
  '/orgs/:organizationId/events/:eventId/venue-map',
  authenticate,
  validate({ params: orgEventParamsSchema, body: upsertVenueMapSchema }),
  requireOrganizationRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const map = await VenueMapsService.upsert(req.params.eventId as string, req.body);
      res.json({ success: true, data: map });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /orgs/:organizationId/events/:eventId/venue-map
 */
router.delete(
  '/orgs/:organizationId/events/:eventId/venue-map',
  authenticate,
  validate({ params: orgEventParamsSchema }),
  requireOrganizationRole('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await VenueMapsService.remove(req.params.eventId as string);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

export const venueMapsRouter = router;
