import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AdminController } from './admin.controller';
import {
  moderateEventSchema,
  manageUserSchema,
  listEventsSchema,
  listUsersSchema,
  eventIdParamSchema,
  userIdParamSchema,
} from './admin.validators';
import { UserRole } from '../../generated/prisma/client';

export const adminRouter = Router();

/**
 * GET /admin/dashboard
 * Obter dashboard (autenticado, admin)
 */
adminRouter.get(
  '/dashboard',
  authenticate,
  authorize(UserRole.admin),
  AdminController.getDashboard,
);

/**
 * GET /admin/events
 * Listar eventos (autenticado, admin)
 */
adminRouter.get(
  '/events',
  authenticate,
  authorize(UserRole.admin),
  validate({ query: listEventsSchema }),
  AdminController.listEvents,
);

/**
 * PATCH /admin/events/:id/moderate
 * Moderar evento (autenticado, admin)
 */
adminRouter.patch(
  '/events/:id/moderate',
  authenticate,
  authorize(UserRole.admin),
  validate({ params: eventIdParamSchema, body: moderateEventSchema }),
  AdminController.moderateEvent,
);

/**
 * GET /admin/users
 * Listar usuários (autenticado, admin)
 */
adminRouter.get(
  '/users',
  authenticate,
  authorize(UserRole.admin),
  validate({ query: listUsersSchema }),
  AdminController.listUsers,
);

/**
 * PATCH /admin/users/:id/manage
 * Gerenciar usuário (autenticado, admin)
 */
adminRouter.patch(
  '/users/:id/manage',
  authenticate,
  authorize(UserRole.admin),
  validate({ params: userIdParamSchema, body: manageUserSchema }),
  AdminController.manageUser,
);
