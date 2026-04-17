import { prisma } from '../../config/database';
import { asaasFetch } from '../../config/asaas';
import { decrypt } from '../../shared/crypto';
import { logAudit } from '../../shared/audit';
import { NotFoundError, BadRequestError, InternalError } from '../../shared/errors';
import { GetFinancialSummaryQuery, RequestWithdrawalInput, GetStatementQuery } from './producers.validators';
import { AsaasBalance, AsaasTransfer, AsaasStatement } from '../../types/asaas.types';

/**
 * Gerencia operações financeiras do produtor: saques, extratos, saldos
 */
export class FinanceService {
  /**
   * Obtém resumo financeiro do produtor
   * CRITICAL: Usa GET /v3/finance/balance com apiKey da subconta (não da plataforma)
   */
  static async getFinancialSummary(
    producerId: string,
  ): Promise<{
    totalBalance: number;
    availableBalance: number;
    pendingBalance: number;
    eventsCount: number;
    totalRevenue: number;
    lastUpdated: Date;
  }> {
    const producer = await prisma.producer.findUnique({
      where: { id: producerId },
      include: {
        user: {
          select: { id: true },
        },
      },
    });

    if (!producer) {
      throw new NotFoundError('Produtor não encontrado');
    }

    // Descriptografar API key da subconta
    let apiKey: string;
    try {
      apiKey = decrypt(producer.asaasApiKeyEncrypted);
    } catch (error) {
      console.error('Erro ao descriptografar apiKey do produtor:', error);
      throw new InternalError('Erro de segurança ao acessar dados financeiros');
    }

    try {
      // CRITICAL: Chamar /v3/finance/balance (não /v3/accounts/{id}/balance)
      // CRITICAL: Usar apiKey da subconta
      const balanceResponse = await asaasFetch<AsaasBalance>(
        '/v3/finance/balance',
        {
          method: 'GET',
          apiKey, // Usar API key da subconta
        },
      );

      // Contar eventos
      const eventsCount = await prisma.event.count({
        where: { producerId: producer.userId },
      });

      // Calcular receita total (somatório de pedidos pagos)
      const orders = await prisma.order.aggregate({
        where: {
          event: {
            producerId: producer.userId,
          },
          status: 'paid',
        },
        _sum: {
          totalCents: true,
        },
      });

      const totalRevenueCents = orders._sum.totalCents || 0;

      return {
        totalBalance: balanceResponse.balance || balanceResponse.totalBalance || 0,
        availableBalance: balanceResponse.availableBalance || 0,
        pendingBalance: balanceResponse.pendingBalance || 0,
        eventsCount,
        totalRevenue: totalRevenueCents / 100,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Erro ao buscar saldo do Asaas:', error);
      throw new InternalError(
        'Erro ao buscar resumo financeiro. Tente novamente mais tarde.',
      );
    }
  }

  /**
   * Solicita saque/transferência da conta Asaas para conta bancária
   * CRITICAL: Usa POST /v3/transfers com apiKey da subconta
   */
  static async requestWithdrawal(
    producerId: string,
    data: RequestWithdrawalInput,
  ): Promise<{
    transferId: string;
    status: string;
    amount: number;
    scheduledDate: string;
  }> {
    const producer = await prisma.producer.findUnique({
      where: { id: producerId },
    });

    if (!producer) {
      throw new NotFoundError('Produtor não encontrado');
    }

    // Descriptografar API key
    let apiKey: string;
    try {
      apiKey = decrypt(producer.asaasApiKeyEncrypted);
    } catch (error) {
      console.error('Erro ao descriptografar apiKey:', error);
      throw new InternalError('Erro de segurança ao processar saque');
    }

    try {
      // Verificar saldo disponível
      const balance = await asaasFetch<AsaasBalance>(
        '/v3/finance/balance',
        {
          method: 'GET',
          apiKey,
        },
      );

      const availableBalance = balance.availableBalance || balance.balance || 0;
      if (data.amount > availableBalance) {
        throw new BadRequestError(
          `Saldo insuficiente. Disponível: R$ ${(availableBalance / 100).toFixed(2)}`,
        );
      }

      // Buscar dados bancários
      if (!producer.bankAccount) {
        throw new BadRequestError('Conta bancária não configurada. Complete seu perfil para realizar saques.');
      }

      // Criar transferência via Asaas
      const transferPayload = {
        bankAccountId: producer.asaasWalletId, // walletId ou bankAccountId da subconta
        amount: Math.round(data.amount * 100), // Converter para centavos
      };

      const transferResponse = await asaasFetch<AsaasTransfer>(
        '/v3/transfers',
        {
          method: 'POST',
          body: transferPayload,
          apiKey, // Usar API key da subconta
        },
      );

      if (!transferResponse.id) {
        throw new Error('Falha ao criar transferência no Asaas');
      }

      // Log de auditoria
      await logAudit({
        actorId: producer.userId,
        action: 'producer.withdrawal_requested',
        entityType: 'Transfer',
        entityId: transferResponse.id,
        metadata: {
          producerId,
          amount: data.amount,
          status: transferResponse.status,
        },
      });

      return {
        transferId: transferResponse.id,
        status: transferResponse.status,
        amount: data.amount,
        scheduledDate: transferResponse.scheduleDate || new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      console.error('Erro ao solicitar saque:', error);
      throw new InternalError('Erro ao processar saque. Tente novamente mais tarde.');
    }
  }

  /**
   * Obtém extrato financeiro da subconta
   * CRITICAL: Usa GET /v3/financialTransactions com apiKey da subconta
   */
  static async getStatement(
    producerId: string,
    query: GetStatementQuery,
  ): Promise<{
    transactions: unknown[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const producer = await prisma.producer.findUnique({
      where: { id: producerId },
    });

    if (!producer) {
      throw new NotFoundError('Produtor não encontrado');
    }

    // Descriptografar API key
    let apiKey: string;
    try {
      apiKey = decrypt(producer.asaasApiKeyEncrypted);
    } catch (error) {
      console.error('Erro ao descriptografar apiKey:', error);
      throw new InternalError('Erro de segurança ao acessar extrato');
    }

    try {
      // Buscar transações financeiras
      const params = new URLSearchParams({
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        limit: String(query.limit || 20),
        offset: String(query.offset || 0),
      });

      const statementResponse = await asaasFetch<AsaasStatement>(
        `/v3/financialTransactions?${params.toString()}`,
        {
          method: 'GET',
          apiKey,
        },
      );

      return {
        transactions: statementResponse.data || [],
        total: statementResponse.totalCount || 0,
        limit: query.limit || 20,
        offset: query.offset || 0,
      };
    } catch (error) {
      console.error('Erro ao buscar extrato:', error);
      throw new InternalError('Erro ao buscar extrato. Tente novamente mais tarde.');
    }
  }
}
