import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { requireEventOwnership } from '../../middleware/eventOwnership';
import { validate } from '../../middleware/validate';
import { GuestListsController } from './guest-lists.controller';
import {
  createOrUpdateConfigSchema,
  addEntrySchema,
  listEntriesSchema,
  updateEntrySchema,
  importCSVSchema,
  searchEntriesSchema,
  checkinGuestSchema,
  publicRegisterSchema,
} from './guest-lists.validators';

export const guestListsRouter = Router();

/**
 * POST /guest-lists/:eventId/config
 * Criar/atualizar configuração (autenticado + producer)
 */
guestListsRouter.post(
  '/:eventId/config',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({ body: createOrUpdateConfigSchema }),
  GuestListsController.createOrUpdateConfig,
);

/**
 * GET /guest-lists/:eventId/config
 * Obter configuração (autenticado)
 */
guestListsRouter.get(
  '/:eventId/config',
  authenticate,
  GuestListsController.getConfig,
);

/**
 * POST /guest-lists/:eventId/entries
 * Adicionar entrada manualmente (autenticado + producer)
 */
guestListsRouter.post(
  '/:eventId/entries',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({ body: addEntrySchema }),
  GuestListsController.addEntry,
);

/**
 * POST /guest-lists/:eventId/import
 * Importar CSV (autenticado + producer)
 */
guestListsRouter.post(
  '/:eventId/import',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({ body: importCSVSchema }),
  GuestListsController.importCSV,
);

/**
 * GET /guest-lists/:eventId/entries
 * Listar entradas (autenticado + producer)
 */
guestListsRouter.get(
  '/:eventId/entries',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({ query: listEntriesSchema }),
  GuestListsController.listEntries,
);

/**
 * PATCH /guest-lists/entries/:id
 * Atualizar entrada (autenticado + producer)
 */
guestListsRouter.patch(
  '/entries/:id',
  authenticate,
  authorize('producer', 'admin'),
  validate({ body: updateEntrySchema }),
  GuestListsController.updateEntry,
);

/**
 * DELETE /guest-lists/entries/:id
 * Remover entrada (autenticado + producer)
 */
guestListsRouter.delete(
  '/entries/:id',
  authenticate,
  authorize('producer', 'admin'),
  GuestListsController.removeEntry,
);

/**
 * GET /guest-lists/:eventId/search
 * Buscar entradas (autenticado + producer)
 */
guestListsRouter.get(
  '/:eventId/search',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({ query: searchEntriesSchema }),
  GuestListsController.searchEntries,
);

/**
 * POST /guest-lists/:eventId/checkin
 * Check-in de convidado (autenticado)
 */
guestListsRouter.post(
  '/:eventId/checkin',
  authenticate,
  validate({ body: checkinGuestSchema }),
  GuestListsController.checkinGuest,
);

/**
 * GET /guest-lists/:eventId/stats
 * Obter estatísticas (autenticado + producer)
 */
guestListsRouter.get(
  '/:eventId/stats',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  GuestListsController.getStats,
);

/**
 * GET /guest-lists/:eventId/report
 * Obter relatório completo (autenticado + producer)
 */
guestListsRouter.get(
  '/:eventId/report',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  GuestListsController.getReport,
);

/**
 * POST /guest-lists/register/:shareLink
 * Registrar via link (público, sem autenticação)
 */
guestListsRouter.post(
  '/register/:shareLink',
  validate({ body: publicRegisterSchema }),
  GuestListsController.registerPublic,
);

/**
 * GET /guest-lists/link-info/:shareLink
 * Obter informações do link (público)
 */
guestListsRouter.get(
  '/link-info/:shareLink',
  GuestListsController.getLinkInfo,
);
