import { prisma } from '../../config/database';
import { asaasFetch } from '../../config/asaas';
import { env } from '../../config/env';
import { decrypt } from '../../shared/crypto';
import { NotFoundError, InternalError } from '../../shared/errors';
import { CheckoutInput, mapBillingType } from './payments.validators';
import { CheckoutService } from './checkout.service';
import { WebhookService } from './webhook.service';
import { RiskService } from './risk.service';
import { AsaasCustomer, AsaasPayment, CreatePaymentResponse } from '../../types/asaas.types';

/**
 * Serviço principal de pagamentos que orquestra os sub-serviços
 */
export class PaymentsService {
  /**
   * Garante que o usuário tem um cliente Asaas criado
   * Tenta recuperar do cache Redis, senão cria um novo no Asaas
   */
  static async ensureAsaasCustomer(
    user: { id: string; email: string; name: string; cpf: string; phone?: string | null },
    apiKey?: string,
  ): Promise<string> {
    const { redis } = await import('../../config/redis');
    const cacheKey = `asaas:customer:${user.id}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Tentar recuperar cliente existente por email
      const existingCustomers = await asaasFetch<AsaasCustomer[]>(
        `/v3/customers?email=${encodeURIComponent(user.email)}`,
        { apiKey },
      );

      if (Array.isArray(existingCustomers) && existingCustomers.length > 0) {
        const customerId = existingCustomers[0].id;
        await redis.setex(cacheKey, 86400, customerId); // Cache por 24h
        return customerId;
      }

      // Criar novo cliente no Asaas
      const newCustomer = await asaasFetch<AsaasCustomer>(
        '/v3/customers',
        {
          method: 'POST',
          body: {
            name: user.name,
            email: user.email,
            cpfCnpj: user.cpf.replace(/\D/g, ''),
            mobilePhone: user.phone || undefined,
          },
          apiKey,
        },
      );

      await redis.setex(cacheKey, 86400, newCustomer.id);
      return newCustomer.id;
    } catch (error) {
      console.error('Erro ao garantir cliente Asaas:', error);
      throw new InternalError('Erro ao processar cliente de pagamento. Tente novamente.');
    }
  }

  /**
   * Realiza o checkout delegando para CheckoutService
   */
  static async checkout(
    userId: string,
    data: CheckoutInput,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    orderId: string;
    paymentData: CreatePaymentResponse;
    status: string;
  }> {
    // 1. Avaliar risco
    const riskAssessment = await RiskService.assessRisk(userId, data, ipAddress, userAgent);

    // 2. Executar checkout
    const { order, platformFeePercent } = await CheckoutService.checkout(
      userId,
      data,
      riskAssessment,
      ipAddress,
      userAgent,
    );

    // 3. Buscar usuário para dados de cliente Asaas
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // 4. Buscar produtor para obter apiKey
    const eventWithProducer = await prisma.event.findUnique({
      where: { id: data.eventId },
      include: {
        producer: true,
      },
    });

    if (!eventWithProducer || !eventWithProducer.producer) {
      throw new NotFoundError('Evento ou produtor não encontrado');
    }

    const producer = await prisma.producer.findUnique({
      where: { userId: eventWithProducer.producerId },
    });

    if (!producer) {
      throw new NotFoundError('Perfil do produtor não encontrado');
    }

    // 5. Descriptografar apiKey do produtor
    const producerApiKey = decrypt(producer.asaasApiKeyEncrypted);

    // 6. Garantir cliente Asaas para o comprador
    const asaasCustomerId = await this.ensureAsaasCustomer(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        cpf: user.cpf,
        phone: user.phone,
      },
      producerApiKey,
    );

    // 7. Criar pagamento no Asaas
    const paymentData = await this.createAsaasPayment(
      order,
      data.paymentMethod as 'pix' | 'credit_card' | 'boleto',
      userId,
      asaasCustomerId,
      producerApiKey,
      platformFeePercent,
    );

    return {
      orderId: order.id,
      paymentData,
      status: 'pending',
    };
  }

  /**
   * Processa webhook delegando para WebhookService
   */
  static async processWebhook(
    event: string,
    payload: unknown,
  ): Promise<void> {
    await WebhookService.processWebhook(event, payload);
  }

  /**
   * Mapeia billingType de nosso enum para Asaas enum
   */
  private static mapBillingType(method: 'pix' | 'credit_card' | 'boleto'): 'PIX' | 'CREDIT_CARD' | 'BOLETO' {
    return mapBillingType(method);
  }

  /**
   * Cria pagamento no Asaas
   * Usa apiKey do produtor para criar a cobrança na conta dele
   * Inclui split para dividir valores com a plataforma
   */
  private static async createAsaasPayment(
    order: { id: string; expiresAt: Date; totalCents: number },
    paymentMethod: 'pix' | 'credit_card' | 'boleto',
    userId: string,
    asaasCustomerId: string,
    producerApiKey: string,
    platformFeePercent: number,
  ): Promise<CreatePaymentResponse> {
    try {
      const billingType = this.mapBillingType(paymentMethod);
      const dueDate = new Date(order.expiresAt).toISOString().split('T')[0];
      const totalValue = order.totalCents / 100;

      // Payload de criação de pagamento
      const paymentPayload = {
        customer: asaasCustomerId, // ID do cliente Asaas, não email
        billingType,
        value: totalValue,
        dueDate,
        description: `Ingresso - Evento`,
        externalReference: order.id, // Para fácil lookup no webhook
        split: [
          {
            walletId: env.ASAAS_WALLET_ID, // Wallet ID da plataforma
            percentualValue: platformFeePercent,
          },
        ],
      };

      // Criar pagamento usando apiKey do produtor
      const asaasResponse = await asaasFetch<AsaasPayment>('/v3/payments', {
        method: 'POST',
        body: paymentPayload,
        apiKey: producerApiKey,
      });

      // Se PIX, buscar QR Code
      interface PixData {
        encodedImage?: string;
        payload?: string;
        expirationDate?: string;
      }
      let pixData: PixData = {};
      if (paymentMethod === 'pix') {
        try {
          const pixQrCodeResponse = await asaasFetch<PixData>(
            `/v3/payments/${asaasResponse.id}/pixQrCode`,
            { apiKey: producerApiKey },
          );
          pixData = {
            encodedImage: pixQrCodeResponse.encodedImage,
            payload: pixQrCodeResponse.payload,
            expirationDate: pixQrCodeResponse.expirationDate,
          };
        } catch (pixError) {
          console.error('Erro ao buscar QR Code PIX:', pixError);
          // Continuar mesmo se QR code falhar (pode ser obtido depois)
        }
      }

      // Atualizar pedido com dados do Asaas
      await prisma.order.update({
        where: { id: order.id },
        data: {
          asaasPaymentId: asaasResponse.id,
          asaasInvoiceUrl: asaasResponse.invoiceUrl,
          ...(paymentMethod === 'pix' &&
            pixData.payload && {
              pixQrCode: pixData.encodedImage,
              pixCopyPaste: pixData.payload,
            }),
        },
      });

      return {
        id: asaasResponse.id,
        status: asaasResponse.status,
        pixQrCode: pixData.encodedImage,
        pixCopyPaste: pixData.payload,
        invoiceUrl: asaasResponse.invoiceUrl,
        billingType,
      };
    } catch (error) {
      console.error('Erro ao criar pagamento Asaas:', error);
      throw new InternalError(
        'Erro ao processar pagamento. Tente novamente ou entre em contato com o suporte.',
      );
    }
  }
}
