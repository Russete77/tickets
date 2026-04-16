import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, InternalError } from '../../shared/errors';

export interface TopupPaymentResult {
  paymentId: string;
  method: 'pix' | 'credit_card';
  pixQrCode?: string;
  pixCopyPaste?: string;
  redirectUrl?: string;
  expiresAt: Date;
}

export interface WebhookPayload {
  event: string;
  data: {
    id: string;
    status: string;
    value: number;
    reference?: string;
  };
}

/**
 * Serviço de gestão de recargas via Asaas
 */
export class TopupService {
  private asaasApiUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

  /**
   * Cria um pagamento de recarga via Asaas
   */
  async createTopupPayment(
    walletId: string,
    amountCents: number,
    paymentMethod: 'pix' | 'credit_card',
    producerAsaasKey: string,
  ): Promise<TopupPaymentResult> {
    // Validar carteira
    const wallet = await prisma.cashlessWallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        status: true,
        eventId: true,
        userId: true,
      },
    });

    if (!wallet) {
      throw new NotFoundError('Carteira não encontrada');
    }

    if (wallet.status !== 'wallet_active') {
      throw new BadRequestError('Carteira não está ativa para recarga');
    }

    const amountBRL = amountCents / 100;

    try {
      // Preparar dados da requisição
      const paymentData = {
        customer: {
          name: `Wallet_${wallet.id}`,
          email: `wallet-${wallet.userId}@ticketeria.local`,
        },
        description: `Recarga de Carteira - Evento ${wallet.eventId}`,
        value: amountBRL,
        dueDate: new Date(Date.now() + 15 * 60 * 1000).toISOString().split('T')[0], // 15 minutos
        reference: walletId,
        pixKey: undefined as string | undefined,
      };

      let response: Response;

      if (paymentMethod === 'pix') {
        // Criar pagamento PIX
        const pixPaymentData = {
          ...paymentData,
          billingType: 'PIX',
          pixKey: 'ticketeria@example.com', // Usar chave PIX configurada do produtor
        };

        response = await fetch(`${this.asaasApiUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': producerAsaasKey,
          },
          body: JSON.stringify(pixPaymentData),
        });
      } else {
        // Criar pagamento por cartão
        const cardPaymentData = {
          ...paymentData,
          billingType: 'CREDIT_CARD',
        };

        response = await fetch(`${this.asaasApiUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': producerAsaasKey,
          },
          body: JSON.stringify(cardPaymentData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Asaas API error: ${response.status} - ${JSON.stringify(errorData)}`,
        );
      }

      const data = await response.json();

      // Registrar transação pendente no banco
      await prisma.cashlessTransaction.create({
        data: {
          walletId,
          type: 'topup',
          status: 'tx_pending',
          amountCents,
          balanceAfter: wallet.id as unknown as number, // Será atualizado no webhook
          paymentMethod: paymentMethod as any,
          asaasPaymentId: data.id,
          metadata: {
            asaasStatus: data.status,
          },
        },
      });

      // Preparar resposta
      const result: TopupPaymentResult = {
        paymentId: data.id,
        method: paymentMethod,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };

      if (paymentMethod === 'pix' && data.pixQrCode) {
        result.pixQrCode = data.pixQrCode;
        result.pixCopyPaste = data.pixCopyPaste || data.qrCode;
      } else if (paymentMethod === 'credit_card') {
        result.redirectUrl = data.checkoutUrl || `${this.asaasApiUrl}/payment/${data.id}`;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new InternalError(`Erro ao processar recarga via Asaas: ${errorMessage}`);
    }
  }

  /**
   * Processa webhook de confirmação de pagamento Asaas
   */
  async processTopupWebhook(payload: WebhookPayload): Promise<{
    walletId: string;
    newBalance: number;
    message: string;
  }> {
    if (payload.event !== 'payment_confirmed' && payload.event !== 'PAYMENT_CONFIRMED') {
      // Ignorar outros eventos
      return {
        walletId: payload.data.reference || '',
        newBalance: 0,
        message: 'Evento não processado',
      };
    }

    const asaasPaymentId = payload.data.id;
    const reference = payload.data.reference;

    if (!reference) {
      throw new BadRequestError('Referência do pagamento não encontrada no webhook');
    }

    // Obter transação pendente
    const transaction = await prisma.cashlessTransaction.findFirst({
      where: {
        asaasPaymentId,
        type: 'topup',
        status: 'tx_pending',
      },
      select: {
        id: true,
        walletId: true,
        amountCents: true,
      },
    });

    if (!transaction) {
      throw new NotFoundError('Transação de recarga não encontrada');
    }

    // Processar crédito na carteira atomicamente
    const result = await prisma.$transaction(async (tx) => {
      // Atualizar saldo
      const wallet = await tx.cashlessWallet.update({
        where: { id: transaction.walletId },
        data: {
          balanceCents: {
            increment: transaction.amountCents,
          },
          totalTopupCents: {
            increment: transaction.amountCents,
          },
          lastUsedAt: new Date(),
        },
        select: {
          id: true,
          balanceCents: true,
        },
      });

      // Atualizar status da transação
      await tx.cashlessTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'tx_completed',
          balanceAfter: wallet.balanceCents,
          metadata: {
            confirmedAt: new Date(),
          },
        },
      });

      return wallet;
    });

    return {
      walletId: result.id,
      newBalance: result.balanceCents,
      message: 'Recarga processada com sucesso',
    };
  }

  /**
   * Valida assinatura do webhook Asaas (se disponível)
   */
  validateWebhookSignature(body: string, signature: string): boolean {
    // Implementar validação de assinatura conforme documentação Asaas
    // Por enquanto, retornar true (implementar com HMAC-SHA256 quando houver secret)
    return true;
  }
}

export const topupService = new TopupService();
