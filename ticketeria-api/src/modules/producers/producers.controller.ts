import { Request, Response, NextFunction } from 'express';
import { ProducersService } from './producers.service';

export class ProducersController {
  /**
   * POST /producers/register
   * Registra um novo produtor e cria subconta no Asaas
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await ProducersService.register(
        userId,
        req.body,
        ipAddress,
        userAgent,
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Conta de produtor criada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /producers/me
   * Obtém perfil completo do produtor autenticado
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const profile = await ProducersService.getProfile(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /producers/me/financial
   * Obtém resumo financeiro e saldo disponível do produtor
   * Chama API Asaas usando API key da subconta
   */
  static async getFinancialSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      // Buscar produtor primeiro para validar
      const producer = await ProducersService.getProfile(userId);

      const summary = await ProducersService.getFinancialSummary(producer.id);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /producers/me/withdrawal
   * Solicita saque/transferência da conta para conta bancária
   */
  static async requestWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      // Buscar produtor para validar
      const producer = await ProducersService.getProfile(userId);

      const result = await ProducersService.requestWithdrawal(producer.id, req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Saque solicitado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /producers/me/statement
   * Obtém extrato financeiro detalhado do produtor
   */
  static async getStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      // Buscar produtor para validar
      const producer = await ProducersService.getProfile(userId);

      const statement = await ProducersService.getStatement(producer.id, req.query as unknown as any);

      res.json({
        success: true,
        data: statement,
      });
    } catch (error) {
      next(error);
    }
  }
}
