import { Request, Response, NextFunction } from 'express';
import { cashlessService } from './cashless.service';
import { walletService } from './wallet.service';
import { transactionService } from './transaction.service';
import { topupService } from './topup.service';
import {
  CreateCashlessConfigInput,
  UpdateCashlessConfigInput,
  CreateWalletInput,
  TopupWalletInput,
  BlockWalletInput,
  RequestRefundInput,
  ChargeWalletInput,
  ReverseTransactionInput,
  WalletTransactionsQuery,
  DashboardQuery,
  TopProductsQuery,
  HourlyStatsQuery,
} from './cashless.validators';

/**
 * Controladores para o módulo cashless
 */
export class CashlessController {
  /**
   * POST /cashless/:eventId/config
   * Criar configuração de cashless para evento
   */
  static async createConfig(
    req: Request<{ eventId: string }, unknown, CreateCashlessConfigInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { eventId } = req.params;
      const config = await cashlessService.createConfig(eventId, req.user.userId, req.body);

      res.status(201).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cashless/:eventId/config
   * Obter configuração de cashless
   */
  static async getConfig(
    req: Request<{ eventId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { eventId } = req.params;
      const includeStats = req.query.includeStats === 'true';
      const config = await cashlessService.getConfig(eventId, includeStats);

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /cashless/:eventId/config
   * Atualizar configuração de cashless
   */
  static async updateConfig(
    req: Request<{ eventId: string }, unknown, UpdateCashlessConfigInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { eventId } = req.params;
      const config = await cashlessService.updateConfig(eventId, req.user.userId, req.body);

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /cashless/wallets
   * Criar nova carteira
   */
  static async createWallet(
    req: Request<unknown, unknown, CreateWalletInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { eventId, walletType, nfcTagId } = req.body;
      const wallet = await walletService.createWallet(
        req.user.userId,
        eventId,
        walletType as any,
        nfcTagId
      );

      res.status(201).json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cashless/wallets/me/:eventId
   * Obter carteira do usuário logado para um evento
   */
  static async getMyWallet(
    req: Request<{ eventId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { eventId } = req.params;
      const wallet = await walletService.getWalletByUserEvent(req.user.userId, eventId);

      res.status(200).json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /cashless/wallets/:id/topup
   * Realizar recarga na carteira
   */
  static async topupWallet(
    req: Request<{ id: string }, unknown, TopupWalletInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { id: walletId } = req.params;
      const { amountCents, paymentMethod } = req.body;

      const topup = await topupService.initiateTopup(
        req.user.userId,
        walletId,
        amountCents,
        paymentMethod
      );

      res.status(201).json({
        success: true,
        data: topup,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /cashless/wallets/:id/block
   * Bloquear carteira
   */
  static async blockWallet(
    req: Request<{ id: string }, unknown, BlockWalletInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { id: walletId } = req.params;
      const { reason } = req.body;

      const wallet = await walletService.blockWallet(walletId, reason);

      res.status(200).json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /cashless/wallets/:id/refund
   * Solicitar reembolso
   */
  static async requestRefund(
    req: Request<{ id: string }, unknown, RequestRefundInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { id: walletId } = req.params;
      const { reason } = req.body;

      const refund = await walletService.requestRefund(req.user.userId, walletId, reason);

      res.status(201).json({
        success: true,
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cashless/wallets/:id/balance
   * Obter saldo da carteira
   */
  static async getWalletBalance(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: walletId } = req.params;
      const balance = await walletService.getBalance(walletId);

      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cashless/wallets/:id/transactions
   * Obter transações da carteira com paginação por cursor
   */
  static async getWalletTransactions(
    req: Request<{ id: string }, unknown, unknown, WalletTransactionsQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: walletId } = req.params;
      const { cursor, limit = 20, direction = 'forward', type } = req.query;

      const transactions = await transactionService.getWalletTransactions(walletId, {
        cursor,
        limit,
        direction: direction as 'forward' | 'backward',
        type,
      });

      res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /cashless/transactions/charge
   * Efetuar cobrança (compra)
   */
  static async chargeWallet(
    req: Request<unknown, unknown, ChargeWalletInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { walletId, amountCents, items, tipCents = 0, metadata } = req.body;

      const result = await transactionService.charge(
        walletId,
        amountCents,
        items,
        tipCents,
        undefined, // posId
        undefined, // operatorId
        metadata
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /cashless/transactions/reverse
   * Reverter transação
   */
  static async reverseTransaction(
    req: Request<unknown, unknown, ReverseTransactionInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const transactionId = (req.body as any).transactionId || '';
      const { reason } = req.body;

      const result = await transactionService.reverseTransaction(transactionId, reason);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cashless/transactions/:id
   * Obter detalhes da transação
   */
  static async getTransaction(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: transactionId } = req.params;
      const transaction = await transactionService.getTransaction(transactionId);

      res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cashless/:eventId/dashboard
   * Obter dashboard com estatísticas
   */
  static async getDashboard(
    req: Request<{ eventId: string }, unknown, unknown, DashboardQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { eventId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await cashlessService.getDashboard(
        eventId,
        req.user.userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cashless/:eventId/transactions
   * Listar transações do evento
   */
  static async getEventTransactions(
    req: Request<{ eventId: string }, unknown, unknown, DashboardQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { eventId } = req.params;
      const { startDate, endDate } = req.query;

      const transactions = await transactionService.getEventTransactions(
        eventId,
        req.user.userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cashless/:eventId/top-products
   * Obter produtos mais vendidos
   */
  static async getTopProducts(
    req: Request<{ eventId: string }, unknown, unknown, TopProductsQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { eventId } = req.params;
      const { limit = 10, startDate, endDate } = req.query;

      const products = await cashlessService.getTopProducts(
        eventId,
        req.user.userId,
        limit as number,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cashless/:eventId/revenue-by-pos
   * Obter receita agrupada por ponto de venda
   */
  static async getRevenueByPos(
    req: Request<{ eventId: string }, unknown, unknown, DashboardQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { eventId } = req.params;
      const { startDate, endDate } = req.query;

      const revenue = await transactionService.getRevenueByPos(
        eventId,
        req.user.userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: revenue,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cashless/:eventId/hourly-stats
   * Obter estatísticas por hora
   */
  static async getHourlyStats(
    req: Request<{ eventId: string }, unknown, unknown, HourlyStatsQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { eventId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await cashlessService.getHourlyStats(
        eventId,
        req.user.userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cashless/:eventId/export
   * Exportar dados de cashless em CSV/JSON
   */
  static async exportData(
    req: Request<{ eventId: string }, unknown, unknown, { format?: 'csv' | 'json' }>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Não autenticado' },
        });
        return;
      }

      const { eventId } = req.params;
      const format = (req.query.format || 'json') as 'csv' | 'json';

      const data = await transactionService.exportEventData(eventId, req.user.userId, format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="cashless-${eventId}-${new Date().toISOString()}.csv"`
        );
        res.send(data);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="cashless-${eventId}-${new Date().toISOString()}.json"`
        );
        res.json({
          success: true,
          data: JSON.parse(data as string),
        });
      }
    } catch (error) {
      next(error);
    }
  }
}
