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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const eventId = req.params.eventId as string;

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const eventId = req.params.eventId as string;

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const eventId = req.params.eventId as string;

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const eventId = req.params.eventId as string;

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const eventId = req.params.eventId as string;
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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const eventId = req.body.eventId || req.query.eventId;

      if (!eventId) {
        res.status(400).json({
          success: false,
          message: 'eventId é obrigatório',
        });
        return;
      }

      const entry = await guestListsService.updateEntry(id as string, eventId as string, req.body);

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const eventId = req.query.eventId as string;

      if (!eventId) {
        res.status(400).json({
          success: false,
          message: 'eventId é obrigatório',
        });
        return;
      }

      await guestListsService.removeEntry(id as string, eventId);

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const eventId = req.params.eventId as string;
      const { query } = req.query;

      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Query é obrigatório',
        });
        return;
      }

      const entries = await guestListsService.searchEntries(eventId as string, query as string);

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const eventId = req.params.eventId as string;
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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const eventId = req.params.eventId as string;

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const eventId = req.params.eventId as string;

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const shareLink = req.params.shareLink as string;

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
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const shareLink = req.params.shareLink as string;

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
