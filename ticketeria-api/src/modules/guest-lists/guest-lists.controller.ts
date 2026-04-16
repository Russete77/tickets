import { Request, Response, NextFunction } from 'express';
import { guestListsService } from './guest-lists.service';
import { importService } from './import.service';
import { registrationService } from './registration.service';
import {
  CreateOrUpdateConfigInput,
  AddEntryInput,
  ListEntriesInput,
  UpdateEntryInput,
  ImportCSVInput,
  SearchEntriesInput,
  CheckinGuestInput,
  PublicRegisterInput,
} from './guest-lists.validators';

/**
 * Controladores para o módulo de guest lists
 */

export class GuestListsController {
  /**
   * POST /guest-lists/:eventId/config
   * Criar/atualizar configuração de guest list
   */
  static async createOrUpdateConfig(
    req: Request<{ eventId: string }, unknown, CreateOrUpdateConfigInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      const config = await guestListsService.createOrUpdateConfig(eventId, req.body);

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /guest-lists/:eventId/config
   * Obter configuração de guest list
   */
  static async getConfig(
    req: Request<{ eventId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      const config = await guestListsService.getConfig(eventId);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /guest-lists/:eventId/entries
   * Adicionar entrada manualmente
   */
  static async addEntry(
    req: Request<{ eventId: string }, unknown, AddEntryInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      const entry = await guestListsService.addEntry(eventId, req.body);

      res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /guest-lists/:eventId/import
   * Importar entradas de CSV
   */
  static async importCSV(
    req: Request<{ eventId: string }, unknown, ImportCSVInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      // Obter config para obter guestListId
      const config = await guestListsService.getConfig(eventId);

      const result = await importService.importFromCSV(
        config.id,
        req.body.csv,
        req.body.listType,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /guest-lists/:eventId/entries
   * Listar entradas com filtros
   */
  static async listEntries(
    req: Request<{ eventId: string }, unknown, unknown, ListEntriesInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;
      const pagination = req.query as unknown as ListEntriesInput;

      const result = await guestListsService.listEntries(eventId, pagination);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /guest-lists/entries/:id
   * Atualizar status de entrada
   */
  static async updateEntry(
    req: Request<{ id: string }, unknown, UpdateEntryInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const eventId = req.body.eventId || req.query.eventId;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'eventId é obrigatório',
        });
      }

      const entry = await guestListsService.updateEntry(id, eventId as string, req.body);

      res.json({
        success: true,
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /guest-lists/entries/:id
   * Remover entrada
   */
  static async removeEntry(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const eventId = req.query.eventId as string;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: 'eventId é obrigatório',
        });
      }

      await guestListsService.removeEntry(id, eventId);

      res.json({
        success: true,
        message: 'Entrada removida com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /guest-lists/:eventId/search
   * Buscar entradas por nome ou CPF
   */
  static async searchEntries(
    req: Request<{ eventId: string }, unknown, unknown, SearchEntriesInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query é obrigatório',
        });
      }

      const entries = await guestListsService.searchEntries(eventId, query as string);

      res.json({
        success: true,
        data: entries,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /guest-lists/:eventId/checkin
   * Fazer check-in de convidado
   */
  static async checkinGuest(
    req: Request<{ eventId: string }, unknown, CheckinGuestInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;
      const { guestId, operatorId, plusOnesCount } = req.body;

      const entry = await guestListsService.checkinGuest(guestId, eventId, operatorId, plusOnesCount);

      res.json({
        success: true,
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /guest-lists/:eventId/stats
   * Obter estatísticas em tempo real
   */
  static async getStats(
    req: Request<{ eventId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      const stats = await guestListsService.getStats(eventId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /guest-lists/:eventId/report
   * Obter relatório completo
   */
  static async getReport(
    req: Request<{ eventId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { eventId } = req.params;

      const report = await guestListsService.getReport(eventId);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /guest-lists/register/:shareLink
   * Registrar via share link (público)
   */
  static async registerPublic(
    req: Request<{ shareLink: string }, unknown, PublicRegisterInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { shareLink } = req.params;

      const result = await registrationService.registerViaLink(shareLink, req.body);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /guest-lists/link-info/:shareLink
   * Obter informações públicas do link (validação e metadata)
   */
  static async getLinkInfo(
    req: Request<{ shareLink: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { shareLink } = req.params;

      const info = await registrationService.validateShareLink(shareLink);

      res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      next(error);
    }
  }
}
