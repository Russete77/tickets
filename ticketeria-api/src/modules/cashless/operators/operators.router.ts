import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireOrganizationRole } from '../../../middleware/organization';
import { validate } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/asyncHandler';
import { OperatorsService } from './operators.service';
import {
  orgPosParamsSchema,
  orgOperatorParamsSchema,
  createOperatorSchema,
  updateOperatorSchema,
  resetPinSchema,
} from './operators.validators';

export const operatorsRouter = Router();
operatorsRouter.use(authenticate);

operatorsRouter.get(
  '/:organizationId/pos/:posId/operators',
  requireOrganizationRole('viewer'),
  validate({ params: orgPosParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await OperatorsService.list({
      organizationId: String(req.params.organizationId),
      posId: String(req.params.posId),
    });
    res.json({ success: true, data });
  }),
);

operatorsRouter.post(
  '/:organizationId/pos/:posId/operators',
  requireOrganizationRole('admin'),
  validate({ params: orgPosParamsSchema, body: createOperatorSchema }),
  asyncHandler(async (req, res) => {
    const data = await OperatorsService.create({
      organizationId: String(req.params.organizationId),
      posId: String(req.params.posId),
      actorId: req.user!.userId,
      data: req.body,
    });
    res.status(201).json({ success: true, data });
  }),
);

operatorsRouter.patch(
  '/:organizationId/operators/:operatorId',
  requireOrganizationRole('admin'),
  validate({ params: orgOperatorParamsSchema, body: updateOperatorSchema }),
  asyncHandler(async (req, res) => {
    const data = await OperatorsService.update({
      organizationId: String(req.params.organizationId),
      operatorId: String(req.params.operatorId),
      actorId: req.user!.userId,
      data: req.body,
    });
    res.json({ success: true, data });
  }),
);

operatorsRouter.patch(
  '/:organizationId/operators/:operatorId/reset-pin',
  requireOrganizationRole('admin'),
  validate({ params: orgOperatorParamsSchema, body: resetPinSchema }),
  asyncHandler(async (req, res) => {
    const data = await OperatorsService.resetPin({
      organizationId: String(req.params.organizationId),
      operatorId: String(req.params.operatorId),
      actorId: req.user!.userId,
      newPin: req.body.newPin,
    });
    res.json({ success: true, data });
  }),
);

operatorsRouter.delete(
  '/:organizationId/operators/:operatorId',
  requireOrganizationRole('admin'),
  validate({ params: orgOperatorParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await OperatorsService.archive({
      organizationId: String(req.params.organizationId),
      operatorId: String(req.params.operatorId),
      actorId: req.user!.userId,
    });
    res.json({ success: true, data });
  }),
);
