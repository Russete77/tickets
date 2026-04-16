import { prisma } from '../../config/database';
import { OnboardingService } from './onboarding.service';
import { FinanceService } from './finance.service';
import { RegisterProducerInput, GetFinancialSummaryQuery, RequestWithdrawalInput, GetStatementQuery } from './producers.validators';
import { Producer, User } from '../../generated/prisma/client';

/**
 * Serviço principal de produtores que orquestra os sub-serviços
 */
export class ProducersService {
  /**
   * Registra um novo produtor delegando para OnboardingService
   */
  static async register(
    userId: string,
    data: RegisterProducerInput,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    producerId: string;
    asaasAccountId: string;
    message: string;
  }> {
    return OnboardingService.register(userId, data, ipAddress, userAgent);
  }

  /**
   * Obtém perfil do produtor
   */
  static async getProfile(userId: string): Promise<Producer & { user: User }> {
    return OnboardingService.getProfile(userId);
  }

  /**
   * Obtém resumo financeiro do produtor
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
    return FinanceService.getFinancialSummary(producerId);
  }

  /**
   * Solicita saque/transferência
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
    return FinanceService.requestWithdrawal(producerId, data);
  }

  /**
   * Obtém extrato financeiro
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
    return FinanceService.getStatement(producerId, query);
  }

  /**
   * Atualiza status de aprovação do produtor (admin)
   */
  static async approveProducer(producerId: string): Promise<Producer> {
    return OnboardingService.approveProducer(producerId);
  }

  /**
   * Obtém lista de produtores (admin)
   */
  static async getProducers(
    status?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{
    data: Producer[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const where: { asaasStatus?: string } = {};

    if (status) {
      where.asaasStatus = status;
    }

    const [producers, total] = await Promise.all([
      prisma.producer.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        skip: offset,
        take: limit,
      }),
      prisma.producer.count({ where }),
    ]);

    return {
      data: producers,
      total,
      limit,
      offset,
    };
  }
}
