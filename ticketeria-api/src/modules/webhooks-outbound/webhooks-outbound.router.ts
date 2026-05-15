/**
 * Router de webhooks outbound — CRUD de subscriptions.
 * Auditoria CTO 2026-05 — gap 4.10
 */
import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { requireOrganizationRole } from '../../middleware/organization';
import { asyncHandler } from '../../shared/asyncHandler';
import { prisma } from '../../config/database';

export const webhooksOutboundRouter = Router();

webhooksOutboundRouter.use(authenticate);

const eventTypes = z.enum([
  'event_published',
  'event_updated',
  'order_paid',
  'order_refunded',
  'ticket_issued',
  'ticket_checked_in',
  'ticket_transferred',
  'cashless_topup',
  'cashless_purchase',
  'cashless_refund',
  'guest_checked_in',
]);

const createSubSchema = {
  params: z.object({ organizationId: z.string().uuid() }),
  body: z.object({
    url: z.url(),
    eventTypes: z.array(eventTypes).min(1),
    description: z.string().max(255).optional(),
  }),
};

webhooksOutboundRouter.get(
  '/:organizationId/subscriptions',
  requireOrganizationRole('admin'),
  asyncHandler(async (req, res) => {
    const subs = await prisma.webhookSubscription.findMany({
      where: { organizationId: String(req.params.organizationId) },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      data: subs.map(({ secret: _secret, ...s }: { secret: string; [k: string]: unknown }) => s),
    });
  }),
);

webhooksOutboundRouter.post(
  '/:organizationId/subscriptions',
  requireOrganizationRole('admin'),
  validate(createSubSchema),
  asyncHandler(async (req, res) => {
    const secret = crypto.randomBytes(32).toString('hex');
    const sub = await prisma.webhookSubscription.create({
      data: {
        organizationId: String(req.params.organizationId),
        url: req.body.url,
        secret,
        eventTypes: req.body.eventTypes,
        description: req.body.description,
      },
    });
    // Retorna o secret apenas na criação.
    res.status(201).json({ success: true, data: sub });
  }),
);

webhooksOutboundRouter.delete(
  '/:organizationId/subscriptions/:subscriptionId',
  requireOrganizationRole('admin'),
  asyncHandler(async (req, res) => {
    await prisma.webhookSubscription.delete({
      where: { id: String(req.params.subscriptionId) },
    });
    res.status(204).end();
  }),
);

webhooksOutboundRouter.get(
  '/:organizationId/subscriptions/:subscriptionId/deliveries',
  requireOrganizationRole('admin'),
  asyncHandler(async (req, res) => {
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { subscriptionId: String(req.params.subscriptionId) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: deliveries });
  }),
);
