import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireOrganizationRole } from '../../../middleware/organization';
import { validate } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/asyncHandler';
import { StockService } from './stock.service';
import {
  orgEventParamsSchema,
  orgPosParamsSchema,
  orgProductParamsSchema,
  createStockMovementSchema,
  movementsQuerySchema,
} from './stock.validators';

export const stockRouter = Router();
stockRouter.use(authenticate);

stockRouter.get(
  '/:organizationId/events/:eventId/stock',
  requireOrganizationRole('viewer'),
  validate({ params: orgEventParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await StockService.stockOverviewByEvent({
      organizationId: String(req.params.organizationId),
      eventId: String(req.params.eventId),
    });
    res.json({ success: true, data });
  }),
);

stockRouter.get(
  '/:organizationId/pos/:posId/stock',
  requireOrganizationRole('viewer'),
  validate({ params: orgPosParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await StockService.stockOverviewByPos({
      organizationId: String(req.params.organizationId),
      posId: String(req.params.posId),
    });
    res.json({ success: true, data });
  }),
);

stockRouter.get(
  '/:organizationId/products/:productId/stock-movements',
  requireOrganizationRole('viewer'),
  validate({ params: orgProductParamsSchema, query: movementsQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await StockService.listMovements({
      organizationId: String(req.params.organizationId),
      productId: String(req.params.productId),
      cursor: req.query.cursor as string | undefined,
      limit: Number(req.query.limit ?? 50),
    });
    res.json({ success: true, data: result.items, meta: { nextCursor: result.nextCursor } });
  }),
);

stockRouter.post(
  '/:organizationId/products/:productId/stock-movements',
  requireOrganizationRole('operator'),
  validate({ params: orgProductParamsSchema, body: createStockMovementSchema }),
  asyncHandler(async (req, res) => {
    const data = await StockService.createMovement({
      organizationId: String(req.params.organizationId),
      productId: String(req.params.productId),
      actorId: req.user!.userId,
      data: req.body,
    });
    res.status(201).json({ success: true, data });
  }),
);
