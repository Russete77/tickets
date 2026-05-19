import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { idempotency } from '../../middleware/idempotency';
import { CustomRequest } from '../../types/middleware.types';
import { CustomerOrdersService } from './customer-orders.service';
import {
  createCustomerOrderSchema,
  updateCustomerOrderStatusSchema,
  customerOrderIdParamsSchema,
  myCustomerOrdersQuerySchema,
} from './customer-orders.validators';

const router = Router();

/**
 * POST /customer-orders
 * Criar novo pedido cashless pelo cliente
 */
router.post(
  '/',
  authenticate,
  idempotency(),
  validate({ body: createCustomerOrderSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await CustomerOrdersService.create({
        userId: req.user!.userId,
        eventId: req.body.eventId as string,
        posId: req.body.posId as string,
        items: req.body.items as Array<{ productId: string; qty: number }>,
        idempotencyKey: (req as CustomRequest).idempotencyKey,
      });
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /customer-orders/me
 * Listar pedidos do cliente autenticado
 */
router.get(
  '/me',
  authenticate,
  validate({ query: myCustomerOrdersQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as {
        cursor?: string;
        limit?: string;
        status?: string;
        eventId?: string;
      };
      const orders = await CustomerOrdersService.getMyOrders({
        userId: req.user!.userId,
        pagination: {
          cursor: query.cursor,
          limit: query.limit ? Number(query.limit) : 20,
          direction: 'forward',
        },
        filters: {
          status: query.status,
          eventId: query.eventId,
        },
      });
      res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /customer-orders/:id/status
 * Atualizar status do pedido (operador)
 */
router.patch(
  '/:id/status',
  authenticate,
  validate({ params: customerOrderIdParamsSchema, body: updateCustomerOrderStatusSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await CustomerOrdersService.updateStatus({
        orderId: req.params.id as string,
        operatorId: req.user!.userId,
        organizationId: req.body.organizationId as string,
        status: req.body.status as 'preparing' | 'ready' | 'delivered',
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /customer-orders/:id/cancel
 * Cancelar pedido pelo cliente
 */
router.post(
  '/:id/cancel',
  authenticate,
  validate({ params: customerOrderIdParamsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cancelled = await CustomerOrdersService.cancelByCustomer({
        orderId: req.params.id as string,
        userId: req.user!.userId,
      });
      res.json({ success: true, data: cancelled });
    } catch (error) {
      next(error);
    }
  },
);

export const customerOrdersRouter = router;
