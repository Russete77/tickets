import { Request, Response, NextFunction } from 'express';
import { CheckinService } from './checkin.service';

export class CheckinController {
  /**
   * POST /checkin/validate
   * Valida QR code e realiza check-in
   */
  static async validateQR(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { qrData, operatorId, deviceId, eventId } = req.body;

      const result = await CheckinService.validateQR(
        qrData,
        operatorId,
        deviceId,
        eventId,
      );

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /checkin/capacity/:eventId
   * Obtém capacidade em tempo real
   */
  static async getCapacity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.params.eventId as string;

      const capacity = await CheckinService.getEventCapacity(eventId);

      res.json({
        success: true,
        data: capacity,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /checkin/sync
   * Sincroniza check-ins offline
   */
  static async syncOfflineCheckins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId, checkins } = req.body;

      const result = await CheckinService.syncOfflineCheckins(eventId, checkins);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
