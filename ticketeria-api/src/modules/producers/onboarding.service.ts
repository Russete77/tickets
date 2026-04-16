import { prisma } from '../../config/database';
import { asaasFetch } from '../../config/asaas';
import { asaasConfig } from '../../config/asaas';
import { encrypt } from '../../shared/crypto';
import { logAudit, AuditActions } from '../../shared/audit';
import { NotFoundError, BadRequestError, ConflictError, InternalError } from '../../shared/errors';
import { RegisterProducerInput } from './producers.validators';
import { Producer } from '../../generated/prisma/client';

/**
 * Mapeia tipos de empresa Prisma para formatos aceitos pela Asaas
 * Asaas aceita: MEI, LIMITED, INDIVIDUAL, ASSOCIATION
 */
function mapCompanyTypeToAsaas(companyType: string): string {
  const mapping: Record<string, string> = {
    MEI: 'MEI',
    ME: 'LIMITED',
    EPP: 'LIMITED',
    LTDA: 'LIMITED',
    SA: 'LIMITED',
    INDIVIDUAL: 'INDIVIDUAL',
  };
  return mapping[companyType] || companyType;
}

/**
 * Gerencia o onboarding de produtores: registro, criação de conta Asaas, verificação de documentos
 */
export class OnboardingService {
  /**
   * Registra um novo produtor
   * Cria subconta no Asaas com ALL required fields conforme documentação oficial
   * CRITICAL: webhooks DEVEM ser configurados no momento da criação
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
    // 1. Verificar se usuário já é produtor
    const existingProducer = await prisma.producer.findUnique({
      where: { userId },
    });

    if (existingProducer) {
      throw new ConflictError('Você já está registrado como produtor');
    }

    // 2. Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    try {
      // 3. Mapear tipo de empresa para formato Asaas
      const asaasCompanyType = mapCompanyTypeToAsaas(data.companyType);

      // 4. Preparar payload para criação de subconta conforme API Asaas v3
      // CRITICAL: Usar cpfCnpj (não document)
      // CRITICAL: Todos os campos requeridos devem estar presentes
      const asaasPayload = {
        // Dados requeridos
        name: data.companyName,
        email: data.email || user.email,
        cpfCnpj: data.cpfCnpj || user.cpf, // CRITICAL: cpfCnpj (não document)
        mobilePhone: data.mobilePhone || user.phone || '',
        incomeValue: data.incomeValue, // CRITICAL: renda mensal em BRL

        // Endereço (requerido)
        address: data.address,
        addressNumber: data.addressNumber,
        province: data.province, // bairro/região
        postalCode: data.postalCode, // CEP sem formatação
        city: data.city,
        state: data.state,

        // Dados opcionais
        complement: data.complement || undefined,
        companyType: asaasCompanyType, // MEI, LIMITED, INDIVIDUAL, ASSOCIATION
        phone: data.phone || undefined,
        birthDate: data.birthDate || undefined,
        site: data.site || undefined,
        loginEmail: user.email,

        // CRITICAL: Webhooks DEVEM ser configurados no momento da criação
        webhooks: [
          {
            url: `${asaasConfig.webhookUrl || 'https://api.ticketeria.com.br'}/api/v1/payments/webhook`,
            email: data.email || user.email,
            enabled: true,
            interrupted: false,
            apiVersion: 3,
            authToken: asaasConfig.webhookSecret,
            events: [
              // Payment events
              'PAYMENT_CREATED',
              'PAYMENT_CONFIRMED',
              'PAYMENT_RECEIVED',
              'PAYMENT_OVERDUE',
              'PAYMENT_DELETED',
              'PAYMENT_REFUNDED',
              'PAYMENT_PARTIALLY_REFUNDED',
              'PAYMENT_CHARGEBACK_REQUESTED',
              // Transfer events
              'TRANSFER_CREATED',
              'TRANSFER_PENDING',
              'TRANSFER_DONE',
              // Account events
              'ACCOUNT_STATUS_CHANGED',
            ],
          },
        ],
      };

      // 5. Criar subconta no Asaas
      interface AsaasAccountResponse {
        id: string;
        apiKey: string;
        walletId?: string;
      }
      const asaasResponse = await asaasFetch<AsaasAccountResponse>('/v3/accounts', {
        method: 'POST',
        body: asaasPayload,
      });

      if (!asaasResponse.id) {
        throw new Error('Falha ao criar subconta no Asaas: ID não retornado');
      }

      if (!asaasResponse.apiKey) {
        throw new Error('CRITICAL: Asaas não retornou apiKey - não será possível recuperar depois!');
      }

      // 6. Criptografar API key da subconta com AES-256-GCM
      const encryptedApiKey = encrypt(asaasResponse.apiKey);

      // 7. Criar produtor no banco de dados com todos os dados
      const producer = await prisma.producer.create({
        data: {
          userId,
          companyName: data.companyName,
          cnpj: data.cpfCnpj, // Pode ser CPF ou CNPJ
          companyType: data.companyType,
          asaasAccountId: asaasResponse.id,
          asaasApiKeyEncrypted: encryptedApiKey,
          asaasWalletId: asaasResponse.walletId || '',
          bankAccount: data.bankAccount ? JSON.parse(JSON.stringify(data.bankAccount)) : null,
          asaasStatus: 'pending', // Novo status é pending até aprovação
        },
      });

      // 8. Atualizar role do usuário para producer
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'producer',
        },
      });

      // 9. Log de auditoria
      await logAudit({
        actorId: userId,
        action: AuditActions.PRODUCER_CREATED,
        entityType: 'Producer',
        entityId: producer.id,
        metadata: {
          companyName: data.companyName,
          companyType: data.companyType,
          asaasCompanyType,
          asaasAccountId: asaasResponse.id,
          webhooksConfigured: true,
        },
        ipAddress,
        userAgent,
      });

      return {
        producerId: producer.id,
        asaasAccountId: asaasResponse.id,
        message: 'Conta de produtor criada com sucesso. Webhooks foram configurados automaticamente.',
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Producer registration error:', error.message);
        if (error.message.includes('Asaas') || error.message.includes('API')) {
          throw new InternalError(
            'Erro ao criar conta com provedor de pagamento. Tente novamente mais tarde.',
          );
        }
      }
      throw error;
    }
  }

  /**
   * Obtém perfil do produtor com dados do usuário
   */
  static async getProfile(userId: string): Promise<Producer & { user: { id: string; email: string; name: string; cpf: string } }> {
    const producer = await prisma.producer.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            cpf: true,
            createdAt: true,
          },
        },
      },
    });

    if (!producer) {
      throw new NotFoundError('Perfil de produtor não encontrado');
    }

    return producer;
  }

  /**
   * Atualiza status de aprovação do produtor (admin)
   */
  static async approveProducer(producerId: string): Promise<Producer> {
    const producer = await prisma.producer.update({
      where: { id: producerId },
      data: {
        asaasStatus: 'approved',
        approvedAt: new Date(),
      },
    });

    // Log de auditoria
    await logAudit({
      action: AuditActions.PRODUCER_APPROVED,
      entityType: 'Producer',
      entityId: producerId,
      metadata: {
        producerId,
      },
    });

    return producer;
  }
}
