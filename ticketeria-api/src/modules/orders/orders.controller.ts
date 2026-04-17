import { Request, Response, NextFunction } from 'express';
import { OrdersService } from './orders.service';

interface QueryParams {
  cursor?: string;
  limit?: string;
  direction?: string;
  status?: string;
  eventId?: string;
}

export class OrdersController {
  /**
   * GET /orders
   * Retorna pedidos do usuário autenticado
   */
  static async getMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { cursor, limit, direction, status, eventId } = req.query as unknown as QueryParams;

      const orders = await OrdersService.getMyOrders(
        userId,
        {
          cursor,
          limit: limit ? parseInt(limit, 10) : 20,
          direction: direction as 'forward' | 'backward' | undefined,
        },
        {
          status: status as any,
          eventId,
        },
      );

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /orders/:id
   * Retorna detalhes de um pedido específico
   */
  static async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;

      const order = await OrdersService.getOrderById(id, userId);

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /orders/:id/cancel
   * Cancela um pedido pendente
   */
  static async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      const order = await OrdersService.cancelOrder(id, userId, ipAddress, userAgent);

      res.json({
        success: true,
        data: order,
        message: 'Pedido cancelado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }
}
