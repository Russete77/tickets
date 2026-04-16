import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';

export class PaymentsController {
  /**
   * POST /payments/checkout
   * Realiza o checkout de compra de ingressos
   */
  static async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await PaymentsService.checkout(
        userId,
        req.body,
        ipAddress,
        userAgent,
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
