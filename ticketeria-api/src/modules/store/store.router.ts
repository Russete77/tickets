import { Router } from 'express';
import { StoreController } from './store.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createItemSchema,
  updateItemSchema,
  itemIdParamSchema,
  eventIdParamSchema,
  purchaseItemSchema,
} from './store.validators';

const router = Router();

/**
 * POST /store/:eventId
 * Cria novo item na loja (auth+producer/admin)
 */
router.post(
  '/:eventId',
  authenticate,
  authorize(['producer', 'admin']),
  validate({ params: eventIdParamSchema, body: createItemSchema }),
  StoreController.createItem,
);

/**
 * GET /store/:eventId
 * Lista itens da loja do evento (public)
 */
router.get(
  '/:eventId',
  validate({ params: eventIdParamSchema }),
  StoreController.listItems,
);

/**
 * GET /store/items/:id
 * Obtém um item específico (public)
 */
router.get(
  '/items/:id',
  validate({ params: itemIdParamSchema }),
  StoreController.getItem,
);

/**
 * PATCH /store/items/:id
 * Atualiza um item (auth+producer/admin)
 */
router.patch(
  '/items/:id',
  authenticate,
  authorize(['producer', 'admin']),
  validate({ params: itemIdParamSchema, body: updateItemSchema }),
  StoreController.updateItem,
);

/**
 * DELETE /store/items/:id
 * Remove/desativa um item (auth+producer/admin)
 */
router.delete(
  '/items/:id',
  authenticate,
  authorize(['producer', 'admin']),
  validate({ params: itemIdParamSchema }),
  StoreController.deleteItem,
);

/**
 * POST /store/items/:id/purchase
 * Processa compra de item (auth)
 */
router.post(
  '/items/:id/purchase',
  authenticate,
  validate({ params: itemIdParamSchema, body: purchaseItemSchema }),
  StoreController.purchaseItem,
);

export const storeRouter = router;
