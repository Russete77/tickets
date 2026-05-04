import { z } from 'zod';

/**
 * Payload Sympla — formato baseado nos webhooks reais que o Sympla envia para
 * organizadores que migraram seus eventos. Campos adicionais são tolerados.
 */
export const symplaWebhookSchema = z.object({
  event: z.enum([
    'ORDER_APPROVED',
    'ORDER_CANCELED',
    'ORDER_REFUNDED',
    'CHECKIN_CREATED',
  ]),
  data: z.object({
    order_id: z.string(),
    event_id: z.string(),
    event_name: z.string().optional(),
    buyer: z
      .object({
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().email(),
        document: z.string().optional(),
        phone: z.string().optional(),
      })
      .optional(),
    ticket: z
      .object({
        ticket_id: z.string(),
        ticket_name: z.string().optional(),
        amount: z.number().optional(),
      })
      .optional(),
    occurred_at: z.string().datetime().optional(),
  }),
});

export type SymplaWebhookInput = z.infer<typeof symplaWebhookSchema>;

/**
 * Payload Ingresso.com — formato genérico que cobre o webhook deles.
 */
export const ingressoWebhookSchema = z.object({
  type: z.enum(['order.paid', 'order.canceled', 'checkin.scanned']),
  externalOrderId: z.string(),
  externalEventId: z.string(),
  customer: z.object({
    name: z.string(),
    email: z.string().email(),
    cpf: z.string().optional(),
  }),
  ticket: z.object({
    code: z.string(),
    type: z.string().optional(),
    valueCents: z.number().int().nonnegative().optional(),
  }),
  occurredAt: z.string().datetime(),
});

export type IngressoWebhookInput = z.infer<typeof ingressoWebhookSchema>;
