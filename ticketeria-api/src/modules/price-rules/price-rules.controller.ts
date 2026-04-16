import { Request, Response, NextFunction } from 'express';
import { priceRulesService } from './price-rules.service';
import {
  CreateRuleInput,
  UpdateRuleInput,
  BatchIdParam,
  IdParam,
} from './price-rules.validators';

/**
 * Controladores para gerenciamento de regras de preço
 */
export class PriceRulesController {
  /**
   * POST /price-rules/:batchId
   * Criar nova regra de preço para um lote
   */
  static async createRule(
    req: Request<BatchIdParam, unknown, CreateRuleInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { batchId } = req.params;
      const { priceType, priceCents, quantity, requiresDoc } = req.body;

      const rule = await priceRulesService.createRule(userId, batchId, {
        priceType,
        priceCents,
        quantity,
        requiresDoc,
      });

      res.status(201).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /price-rules/:batchId
   * Listar regras de preço de um lote
   */
  static async getRules(
    req: Request<BatchIdParam>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { batchId } = req.params;

      const rules = await priceRulesService.getRules(batchId);

      res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /price-rules/:id
   * Atualizar uma regra de preço
   */
  static async updateRule(
    req: Request<IdParam, unknown, UpdateRuleInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const updateData = req.body;

      const rule = await priceRulesService.updateRule(userId, id, updateData);

      res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /price-rules/:id
   * Deletar uma regra de preço (soft delete)
   */
  static async deleteRule(
    req: Request<IdParam>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await priceRulesService.deleteRule(userId, id);

      res.status(200).json({
        success: true,
        data: { id },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /price-rules/:batchId/availability
   * Verificar disponibilidade de cada tipo de preço
   */
  static async checkAvailability(
    req: Request<BatchIdParam>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { batchId } = req.params;

      const availability = await priceRulesService.checkAvailability(batchId);

      res.status(200).json({
        success: true,
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  }
}
