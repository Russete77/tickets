import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { PermissionsController } from './permissions.controller';
import {
  grantPermissionSchema,
  userIdParamSchema,
  eventIdParamSchema,
  idParamSchema,
  checkPermissionSchema,
} from './permissions.validators';

export const permissionsRouter = Router();

/**
 * POST /permissions
 * Conceder permissão a um usuário
 * Requer autenticação e papel de admin/produtor
 */
permissionsRouter.post(
  '/',
  authenticate,
  authorize('admin', 'producer'),
  validate({ body: grantPermissionSchema }),
  PermissionsController.grantPermission,
);

/**
 * GET /permissions/user/:userId
 * Listar todas as permissões de um usuário
 * Requer autenticação
 */
permissionsRouter.get(
  '/user/:userId',
  authenticate,
  validate({ params: userIdParamSchema }),
  PermissionsController.getUserPermissions,
);

/**
 * GET /permissions/event/:eventId
 * Listar todas as permissões de um evento
 * Requer autenticação e papel de produtor/admin
 */
permissionsRouter.get(
  '/event/:eventId',
  authenticate,
  authorize('admin', 'producer'),
  validate({ params: eventIdParamSchema }),
  PermissionsController.getEventPermissions,
);

/**
 * DELETE /permissions/:id
 * Revogar uma permissão
 * Requer autenticação e papel de admin/produtor
 */
permissionsRouter.delete(
  '/:id',
  authenticate,
  authorize('admin', 'producer'),
  validate({ params: idParamSchema }),
  PermissionsController.revokePermission,
);

/**
 * GET /permissions/check
 * Verificar se o usuário atual tem uma permissão específica
 * Requer autenticação
 */
permissionsRouter.get(
  '/check',
  authenticate,
  validate({ query: checkPermissionSchema }),
  PermissionsController.checkPermission,
);
