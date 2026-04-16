import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { CheckoutInput } from './payments.validators';
import { OrderStatus } from '../../generated/prisma/client';

interface RiskAssessment {
  score: number;
  status: 'approve' | 'review' | 'block';
  reasons: string[];
}

/**
 * Gerencia avaliação de risco e prevenção de fraude
 */
export class RiskService {
  /**
   * Avalia risco da transação com pipeline simplificado
   */
  static async assessRisk(
    userId: string,
    data: CheckoutInput,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RiskAssessment> {
    let score = 0;
    const reasons: string[] = [];

    // Regra 1: Verificar checkout rápido (<5s) - implementado no frontend
    // Para esta implementação, apenas lógica backend

    // Regra 2: Múltiplos CPFs no mesmo dispositivo
    if (data.deviceFingerprint) {
      const cpfsByDevice = await redis.get(`device:${data.deviceFingerprint}`);
      if (cpfsByDevice) {
        const cpfs = JSON.parse(cpfsByDevice);
        if (cpfs.length >= 3 && !cpfs.includes(data.items[0].holderCpf)) {
          score += 50;
          reasons.push('Múltiplos CPFs no mesmo dispositivo');
        }
      }

      // Registrar este CPF para o device
      const storedCpfs = await redis.get(`device:${data.deviceFingerprint}`);
      const cpfList = storedCpfs ? JSON.parse(storedCpfs) : [];
      if (!cpfList.includes(data.items[0].holderCpf)) {
        cpfList.push(data.items[0].holderCpf);
        await redis.set(`device:${data.deviceFingerprint}`, JSON.stringify(cpfList), 'EX', 86400);
      }
    }

    // Regra 3: Histórico de chargebacks (simplificado)
    const userOrders = await prisma.order.count({
      where: {
        userId,
        status: OrderStatus.refunded,
      },
    });

    if (userOrders >= 3) {
      score += 40;
      reasons.push('Histórico de reembolsos');
    }

    // Status final baseado no score
    let status: 'approve' | 'review' | 'block' = 'approve';

    if (score > 70) {
      status = 'block';
    } else if (score >= 40) {
      status = 'review';
    }

    return { score, status, reasons };
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
