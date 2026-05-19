/**
 * Antifraude — cálculo PURO de risco de compra.
 *
 * Recebe sinais já coletados (DB/Redis ficam no RiskService) e devolve
 * score + decisão. Sem I/O: testável isoladamente e determinístico.
 *
 * Thresholds (PRD §4.1):
 *   score > 70  → block   (compra barrada)
 *   score >= 40 → review  (Order.status pendente de revisão manual)
 *   senão       → approve
 */

export interface RiskSignals {
  /** Total de ingressos no checkout (soma de quantity dos items) */
  totalQuantity: number;
  /** CPFs distintos já vistos neste device nas últimas 24h */
  distinctCpfsOnDevice: number;
  /** Pedidos reembolsados (chargeback proxy) do usuário */
  refundedOrdersCount: number;
  /** Pedidos do mesmo CPF nos últimos 7 dias */
  recentOrdersSameCpf: number;
  /** Tentativas do mesmo IP/device nos últimos 5 min */
  deviceVelocityCount: number;
  /** Tempo entre ver o lote e finalizar a compra (ms). null = desconhecido */
  purchaseSpeedMs: number | null;
}

export type RiskDecision = 'approve' | 'review' | 'block';

export interface RiskResult {
  score: number;
  status: RiskDecision;
  reasons: string[];
}

export const RISK_BLOCK_THRESHOLD = 70;
export const RISK_REVIEW_THRESHOLD = 40;

export function computeRiskScore(signals: RiskSignals): RiskResult {
  let score = 0;
  const reasons: string[] = [];

  if (signals.totalQuantity > 4) {
    score += 20;
    reasons.push('Quantidade elevada de ingressos (>4)');
  }

  if (signals.distinctCpfsOnDevice >= 3) {
    score += 50;
    reasons.push('Múltiplos CPFs no mesmo dispositivo');
  }

  if (signals.refundedOrdersCount >= 3) {
    score += 40;
    reasons.push('Histórico de reembolsos');
  }

  if (signals.recentOrdersSameCpf >= 3) {
    score += 30;
    reasons.push('Muitos pedidos do mesmo CPF em 7 dias');
  }

  if (signals.deviceVelocityCount > 5) {
    score += 25;
    reasons.push('Velocidade anormal de tentativas (IP/device)');
  }

  if (signals.purchaseSpeedMs !== null && signals.purchaseSpeedMs < 1000) {
    score += 40;
    reasons.push('Compra concluída em menos de 1s (provável bot)');
  }

  let status: RiskDecision = 'approve';
  if (score > RISK_BLOCK_THRESHOLD) {
    status = 'block';
  } else if (score >= RISK_REVIEW_THRESHOLD) {
    status = 'review';
  }

  return { score, status, reasons };
}
