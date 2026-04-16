import { Request, Response, NextFunction } from 'express';
import { StoreService } from './store.service';
import {
  CreateItemInput,
  UpdateItemInput,
  ItemIdParamInput,
  EventIdParamInput,
  PurchaseItemInput,
} from './store.validators';

export class StoreController {
  /**
   * POST /store/:eventId
   * Cria novo item na loja do evento
   */
  static async createItem(
    req: Request<EventIdParamInput, unknown, CreateItemInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user!.userId;
      const data = req.body;

      const item = await StoreService.createItem(eventId, userId, data);

      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /store/:eventId
   * Lista itens da loja do evento
   */
  static async listItems(
    req: Request<EventIdParamInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      const items = await StoreService.listItems(eventId);

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /store/items/:id
   * Obtém um item específico da loja
   */
  static async getItem(
    req: Request<ItemIdParamInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;

      const item = await StoreService.getItem(id);

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /store/items/:id
   * Atualiza um item da loja
   */
  static async updateItem(
    req: Request<ItemIdParamInput, unknown, UpdateItemInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const data = req.body;

      const item = await StoreService.updateItem(id, userId, data);

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /store/items/:id
   * Remove/desativa um item da loja
   */
  static async deleteItem(
    req: Request<ItemIdParamInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      await StoreService.deleteItem(id, userId);

      res.json({
        success: true,
        message: 'Item removido com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /store/items/:id/purchase
   * Processa compra de item na loja
   */
  static async purchaseItem(
    req: Request<ItemIdParamInput, unknown, PurchaseItemInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const { quantity } = req.body;

      const item = await StoreService.purchaseItem(id, userId, quantity);

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }
}
