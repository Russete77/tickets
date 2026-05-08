import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireOrganizationRole } from '../../../middleware/organization';
import { validate } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/asyncHandler';
import { PosService } from './pos.service';
import {
  orgEventParamsSchema,
  orgPosParamsSchema,
  createPosSchema,
  updatePosSchema,
} from './pos.validators';

export const posRouter = Router();

posRouter.use(authenticate);

posRouter.get(
  '/:organizationId/events/:eventId/pos',
  requireOrganizationRole('viewer'),
  validate({ params: orgEventParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await PosService.list({
      organizationId: String(req.params.organizationId),
      eventId: String(req.params.eventId),
    });
    res.json({ success: true, data });
  }),
);

posRouter.post(
  '/:organizationId/events/:eventId/pos',
  requireOrganizationRole('admin'),
  validate({ params: orgEventParamsSchema, body: createPosSchema }),
  asyncHandler(async (req, res) => {
    const data = await PosService.create({
      organizationId: String(req.params.organizationId),
      eventId: String(req.params.eventId),
      actorId: req.user!.userId,
      data: req.body,
    });
    res.status(201).json({ success: true, data });
  }),
);

posRouter.patch(
  '/:organizationId/pos/:posId',
  requireOrganizationRole('admin'),
  validate({ params: orgPosParamsSchema, body: updatePosSchema }),
  asyncHandler(async (req, res) => {
    const data = await PosService.update({
      organizationId: String(req.params.organizationId),
      posId: String(req.params.posId),
      actorId: req.user!.userId,
      data: req.body,
    });
    res.json({ success: true, data });
  }),
);

posRouter.delete(
  '/:organizationId/pos/:posId',
  requireOrganizationRole('admin'),
  validate({ params: orgPosParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await PosService.archive({
      organizationId: String(req.params.organizationId),
      posId: String(req.params.posId),
      actorId: req.user!.userId,
    });
    res.json({ success: true, data });
  }),
);
