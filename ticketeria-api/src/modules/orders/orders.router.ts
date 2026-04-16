import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getOrdersSchema, orderIdParamSchema } from './orders.validators';

const router = Router();

/**
 * GET /orders
 * Listar pedidos do usuário autenticado
 */
router.get(
  '/',
  authenticate,
  validate({ query: getOrdersSchema }),
  OrdersController.getMyOrders,
);

/**
 * GET /orders/:id
 * Obter detalhes de um pedido
 */
router.get(
  '/:id',
  authenticate,
  validate({ params: orderIdParamSchema }),
  OrdersController.getOrderById,
);

/**
 * POST /orders/:id/cancel
 * Cancelar um pedido pendente
 */
router.post(
  '/:id/cancel',
  authenticate,
  validate({ params: orderIdParamSchema }),
  OrdersController.cancelOrder,
);

export const ordersRouter = router;
