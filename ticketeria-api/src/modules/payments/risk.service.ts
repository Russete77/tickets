import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { CheckoutInput } from './payments.validators';
import { OrderStatus } from '../../generated/prisma/client';
import { computeRiskScore, type RiskResult, type RiskSignals } from '../../shared/antifraud';

/**
 * Gerencia avaliação de risco e prevenção de fraude.
 * Coleta sinais (DB/Redis) e delega o cálculo à função pura `computeRiskScore`.
 */
export class RiskService {
  /**
   * Avalia risco da transação coletando sinais e aplicando computeRiskScore.
   */
  static async assessRisk(
    userId: string,
    data: CheckoutInput,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RiskResult> {
    const primaryCpf = data.items[0]?.holderCpf;
    const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);

    // Sinal: CPFs distintos no mesmo device (24h) + registra o CPF atual
    let distinctCpfsOnDevice = 1;
    if (data.deviceFingerprint) {
      const stored = await redis.get(`device:${data.deviceFingerprint}`);
      const cpfList: string[] = stored ? JSON.parse(stored) : [];
      distinctCpfsOnDevice = new Set(
        primaryCpf ? [...cpfList, primaryCpf] : cpfList,
      ).size;

      if (primaryCpf && !cpfList.includes(primaryCpf)) {
        cpfList.push(primaryCpf);
        await redis.set(
          `device:${data.deviceFingerprint}`,
          JSON.stringify(cpfList),
          'EX',
          86400,
        );
      }
    }

    // Sinal: velocidade de tentativas por device (5 min)
    let deviceVelocityCount = 0;
    if (data.deviceFingerprint) {
      const velKey = `risk:vel:${data.deviceFingerprint}`;
      deviceVelocityCount = await redis.incr(velKey);
      if (deviceVelocityCount === 1) {
        await redis.expire(velKey, 300);
      }
    }

    // Sinal: tempo entre ver o lote e finalizar (anti-bot)
    let purchaseSpeedMs: number | null = null;
    if (data.deviceFingerprint) {
      const viewedAt = await redis.get(`batch:viewed:${data.deviceFingerprint}:${data.eventId}`);
      if (viewedAt) {
        purchaseSpeedMs = Date.now() - parseInt(viewedAt, 10);
      }
    }

    // Sinais via DB
    const [refundedOrdersCount, recentOrdersSameCpf] = await Promise.all([
      prisma.order.count({
        where: { userId, status: OrderStatus.refunded },
      }),
      primaryCpf
        ? prisma.order.count({
            where: {
              userId,
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          })
        : Promise.resolve(0),
    ]);

    const signals: RiskSignals = {
      totalQuantity,
      distinctCpfsOnDevice,
      refundedOrdersCount,
      recentOrdersSameCpf,
      deviceVelocityCount,
      purchaseSpeedMs,
    };

    return computeRiskScore(signals);
  }

  /**
   * Valida um pagamento para detecção de fraude
   */
  static async validatePayment(
    userId: string,
    data: CheckoutInput,
  ): Promise<{ valid: boolean; message?: string }> {
    // Implementar validações adicionais conforme necessário
    // Por enquanto, apenas retorna válido
    return { valid: true };
  }
}
