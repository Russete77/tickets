import { Request, Response, NextFunction } from 'express';
import { StaffService } from './staff.service';
import {
  CreateStaffInput,
  UpdateStaffInput,
  StaffIdParamInput,
  EventIdParamInput,
  StaffCheckinInput,
} from './staff.validators';

export class StaffController {
  /**
   * POST /staff/:eventId
   * Adiciona novo membro de staff ao evento
   */
  static async addStaffMember(
    req: Request<EventIdParamInput, unknown, CreateStaffInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;
      const data = req.body;

      const staff = await StaffService.addStaffMember(eventId, data);

      res.status(201).json({
        success: true,
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /staff/:eventId
   * Lista membros de staff do evento
   */
  static async listStaff(
    req: Request<EventIdParamInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      const staff = await StaffService.listStaff(eventId);

      res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /staff/:id
   * Atualiza membro de staff
   */
  static async updateStaff(
    req: Request<StaffIdParamInput, unknown, UpdateStaffInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const staff = await StaffService.updateStaff(id, data);

      res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /staff/:id
   * Remove membro de staff
   */
  static async removeStaff(
    req: Request<StaffIdParamInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      await StaffService.removeStaff(id);

      res.json({
        success: true,
        message: 'Membro de staff removido com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /staff/:id/checkin
   * Realiza check-in de membro de staff
   */
  static async staffCheckin(
    req: Request<StaffIdParamInput, unknown, StaffCheckinInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const staff = await StaffService.checkinStaff(id, notes);

      res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /staff/:eventId/dashboard
   * Obtém dashboard de staff para o evento
   */
  static async getStaffDashboard(
    req: Request<EventIdParamInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      const dashboard = await StaffService.getStaffDashboard(eventId);

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }
}
