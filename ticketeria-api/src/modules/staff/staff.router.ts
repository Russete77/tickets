import { Router } from 'express';
import { StaffController } from './staff.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireEventOwnership } from '../../middleware/eventOwnership';
import { validate } from '../../middleware/validate';
import {
  createStaffSchema,
  updateStaffSchema,
  staffIdParamSchema,
  eventIdParamSchema,
  staffCheckinSchema,
} from './staff.validators';

const router = Router();

/**
 * POST /staff/:eventId
 * Adiciona novo membro de staff (auth+producer)
 */
router.post(
  '/:eventId',
  authenticate,
  authorize('producer'),
  requireEventOwnership,
  validate({ params: eventIdParamSchema, body: createStaffSchema }),
  StaffController.addStaffMember,
);

/**
 * GET /staff/:eventId
 * Lista membros de staff do evento (auth+producer)
 */
router.get(
  '/:eventId',
  authenticate,
  authorize('producer'),
  requireEventOwnership,
  validate({ params: eventIdParamSchema }),
  StaffController.listStaff,
);

/**
 * PATCH /staff/:id
 * Atualiza membro de staff (auth+producer)
 */
router.patch(
  '/:id',
  authenticate,
  authorize('producer'),
  validate({ params: staffIdParamSchema, body: updateStaffSchema }),
  StaffController.updateStaff,
);

/**
 * DELETE /staff/:id
 * Remove membro de staff (auth+producer)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('producer'),
  validate({ params: staffIdParamSchema }),
  StaffController.removeStaff,
);

/**
 * POST /staff/:id/checkin
 * Realiza check-in de membro de staff (auth)
 */
router.post(
  '/:id/checkin',
  authenticate,
  validate({ params: staffIdParamSchema, body: staffCheckinSchema }),
  StaffController.staffCheckin,
);

/**
 * GET /staff/:eventId/dashboard
 * Obtém dashboard de staff para o evento (auth+producer)
 */
router.get(
  '/:eventId/dashboard',
  authenticate,
  authorize('producer'),
  requireEventOwnership,
  validate({ params: eventIdParamSchema }),
  StaffController.getStaffDashboard,
);

export const staffRouter = router;
