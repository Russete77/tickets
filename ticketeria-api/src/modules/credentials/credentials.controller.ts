import { Request, Response, NextFunction } from 'express';
import { CredentialsService } from './credentials.service';
import {
  CreateCredentialInput,
  ListCredentialsInput,
  BulkCreateInput,
} from './credentials.validators';

/**
 * Controllers para o módulo de credenciais
 */

/**
 * POST /credentials/:eventId
 * Criar credencial para participante
 */
export class CredentialsController {
  static async createCredential(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { eventId } = req.params;
      const data = req.body as CreateCredentialInput;

      const credential = await CredentialsService.create(eventId, userId, data);

      res.status(201).json({
        success: true,
        data: credential,
        message: 'Credencial criada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /credentials/:eventId
   * Listar credenciais do evento
   */
  static async listByEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { eventId } = req.params;
      const { cursor, limit, direction, category } = req.query as unknown as ListCredentialsInput;

      const result = await CredentialsService.list(
        eventId,
        userId,
        {
          cursor,
          limit: limit ? parseInt(String(limit), 10) : 20,
          direction: direction as 'forward' | 'backward' | undefined,
          category,
        },
      );

      res.json({
        success: true,
        data: result.data,
        cursor: result.cursor,
        hasMore: result.hasMore,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /credentials/:id
   * Obter credencial por ID
   */
  static async getCredentialById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const credential = await CredentialsService.getById(id);

      res.json({
        success: true,
        data: credential,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /credentials/:id/checkin
   * Fazer check-in na credencial
   */
  static async checkinCredential(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const credential = await CredentialsService.checkin(id);

      res.json({
        success: true,
        data: credential,
        message: 'Check-in realizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /credentials/:eventId/bulk
   * Criar múltiplas credenciais em lote
   */
  static async bulkCreateCredentials(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { eventId } = req.params;
      const entries = req.body as BulkCreateInput;

      const result = await CredentialsService.bulkCreate(eventId, userId, entries);

      res.status(201).json({
        success: true,
        data: {
          created: result.created,
          credentials: result.credentials,
          errors: result.errors,
        },
        message: `${result.created} credencial(ais) criada(s) com sucesso`,
      });
    } catch (error) {
      next(error);
    }
  }
}
