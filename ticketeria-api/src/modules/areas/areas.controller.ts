import { Request, Response, NextFunction } from 'express';
import { AreasService } from './areas.service';
import {
  CreateAreaInput,
  UpdateAreaInput,
  AreaIdParamInput,
  EventIdParamInput,
  UpdateCountInput,
} from './areas.validators';

export class AreasController {
  /**
   * POST /areas/:eventId
   * Cria nova área no evento
   */
  static async createArea(
    req: Request<EventIdParamInput, unknown, CreateAreaInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;
      const data = req.body;

      const area = await AreasService.createArea(eventId, data);

      res.status(201).json({
        success: true,
        data: area,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /areas/:eventId
   * Lista áreas do evento com contagens em tempo real
   */
  static async listAreas(
    req: Request<EventIdParamInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      const areas = await AreasService.listAreas(eventId);

      res.json({
        success: true,
        data: areas,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /areas/:id
   * Atualiza dados da área
   */
  static async updateArea(
    req: Request<AreaIdParamInput, unknown, UpdateAreaInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const area = await AreasService.updateArea(id, data);

      res.json({
        success: true,
        data: area,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /areas/:id
   * Remove área
   */
  static async deleteArea(
    req: Request<AreaIdParamInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      await AreasService.deleteArea(id);

      res.json({
        success: true,
        message: 'Área removida com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /areas/:id/count
   * Incrementa ou decrementa contagem de pessoas em área
   */
  static async updateAreaCount(
    req: Request<AreaIdParamInput, unknown, UpdateCountInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { delta } = req.body;

      const area = await AreasService.updateAreaCount(id, delta);

      res.json({
        success: true,
        data: area,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /areas/:eventId/capacity
   * Obtém visão geral de capacidade de todas as áreas
   */
  static async getCapacityOverview(
    req: Request<EventIdParamInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      const overview = await AreasService.getCapacityOverview(eventId);

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  }
}
