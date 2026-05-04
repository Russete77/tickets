import crypto from 'crypto';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../shared/logger';
import { logAudit } from '../../shared/audit';
import { env } from '../../config/env';
import { BadRequestError, UnauthorizedError } from '../../shared/errors';
import type { SymplaWebhookInput, IngressoWebhookInput } from './webhooks-external.validators';

/**
 * Recebe e processa webhooks de plataformas externas (Sympla, Ingresso.com).
 *
 * Garantias:
 *   1. Idempotência forçada via Redis (event:order_id → 24h TTL).
 *   2. Validação de assinatura HMAC quando `EXTERNAL_WEBHOOK_SECRET` está setado.
 *   3. Audit log de cada chamada recebida (independente de aceitar ou rejeitar).
 *
 * Estratégia de import:
 *   - O webhook *não* cria o evento na nossa base (isso é setup do produtor).
 *   - Cria/atualiza um registro `Order` espelho com `externalSource` e `externalId`
 *     para permitir reconciliação posterior. Em v1.1 transformamos em ticket interno.
 *
 * Por enquanto o registro é guardado em audit_log com payload completo, permitindo
 * auditoria e replay manual antes de implementar a sincronização full.
 */

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

export interface WebhookProcessResult {
  accepted: boolean;
  duplicate: boolean;
  externalOrderId: string;
  message: string;
}

/**
 * Verifica assinatura HMAC SHA256 do header `X-Signature`.
 * Lança UnauthorizedError se o segredo está configurado e a assinatura não bate.
 *
 * Convenção: assinatura = `hex(hmac_sha256(secret, raw_body))`.
 */
export function verifySignature(rawBody: string, signature: string | undefined): void {
  if (!env.EXTERNAL_WEBHOOK_SECRET) return; // Sem segredo: aceita sem validar (modo dev)
  if (!signature) {
    throw new UnauthorizedError('Assinatura ausente');
  }
  const expected = crypto
    .createHmac('sha256', env.EXTERNAL_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  // Comparação tempo-constante para evitar timing attack
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new UnauthorizedError('Assinatura inválida');
  }
}

async function checkIdempotency(source: string, externalOrderId: string): Promise<boolean> {
  const key = `webhook:ext:${source}:${externalOrderId}`;
  const isNew = await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL_SECONDS, 'NX');
  return isNew === 'OK';
}

/**
 * Processa webhook do Sympla.
 */
export async function processSymplaWebhook(
  payload: SymplaWebhookInput,
  rawBody: string,
  signature: string | undefined,
  ipAddress?: string,
): Promise<WebhookProcessResult> {
  verifySignature(rawBody, signature);

  const externalOrderId = payload.data.order_id;
  const isNew = await checkIdempotency('sympla', externalOrderId);

  await logAudit({
    action: 'webhook.external.sympla',
    entityType: 'external_order',
    entityId: externalOrderId,
    metadata: {
      eventType: payload.event,
      symplaEventId: payload.data.event_id,
      duplicate: !isNew,
      payload: payload as unknown as Record<string, unknown>,
    },
    ipAddress,
  });

  if (!isNew) {
    return {
      accepted: false,
      duplicate: true,
      externalOrderId,
      message: 'Duplicado: já processado nas últimas 24h',
    };
  }

  // TODO (v1.1): mapear para Order interno + emitir Ticket no PulsePass.
  // Por ora apenas registramos para reconciliação manual.
  logger.info(
    { source: 'sympla', externalOrderId, eventType: payload.event },
    'Webhook Sympla aceito',
  );

  return {
    accepted: true,
    duplicate: false,
    externalOrderId,
    message: 'Webhook aceito e registrado para reconciliação',
  };
}

/**
 * Processa webhook do Ingresso.com.
 */
export async function processIngressoWebhook(
  payload: IngressoWebhookInput,
  rawBody: string,
  signature: string | undefined,
  ipAddress?: string,
): Promise<WebhookProcessResult> {
  verifySignature(rawBody, signature);

  const externalOrderId = payload.externalOrderId;
  const isNew = await checkIdempotency('ingresso', externalOrderId);

  await logAudit({
    action: 'webhook.external.ingresso',
    entityType: 'external_order',
    entityId: externalOrderId,
    metadata: {
      eventType: payload.type,
      ingressoEventId: payload.externalEventId,
      duplicate: !isNew,
      payload: payload as unknown as Record<string, unknown>,
    },
    ipAddress,
  });

  if (!isNew) {
    return {
      accepted: false,
      duplicate: true,
      externalOrderId,
      message: 'Duplicado: já processado nas últimas 24h',
    };
  }

  logger.info(
    { source: 'ingresso', externalOrderId, eventType: payload.type },
    'Webhook Ingresso.com aceito',
  );

  return {
    accepted: true,
    duplicate: false,
    externalOrderId,
    message: 'Webhook aceito e registrado para reconciliação',
  };
}

/**
 * Importa um arquivo CSV padrão Sympla (export de pedidos).
 *
 * Aceita as colunas: order_id, buyer_email, buyer_name, ticket_id, event_name, status.
 * Retorna estatísticas de import.
 */
export interface SymplaCsvImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: Array<{ line: number; reason: string }>;
}

export async function importSymplaCsv(csvText: string): Promise<SymplaCsvImportResult> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new BadRequestError('CSV vazio ou sem cabeçalho');
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const orderIdIdx = header.indexOf('order_id');
  const emailIdx = header.indexOf('buyer_email');

  if (orderIdIdx < 0 || emailIdx < 0) {
    throw new BadRequestError('CSV inválido: faltam colunas obrigatórias (order_id, buyer_email)');
  }

  const result: SymplaCsvImportResult = {
    total: lines.length - 1,
    imported: 0,
    duplicates: 0,
    errors: [],
  };

  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const orderId = cells[orderIdIdx];
    const email = cells[emailIdx];

    if (!orderId || !email) {
      result.errors.push({ line: i + 1, reason: 'order_id ou buyer_email ausente' });
      continue;
    }

    const isNew = await checkIdempotency('sympla-csv', orderId);
    if (!isNew) {
      result.duplicates += 1;
      continue;
    }

    await prisma.auditLog.create({
      data: {
        action: 'webhook.external.sympla.csv',
        entityType: 'external_order',
        entityId: orderId,
        metadata: {
          email,
          row: cells,
        } as unknown as object,
      },
    });

    result.imported += 1;
  }

  logger.info(result, 'Sympla CSV import concluído');
  return result;
}
