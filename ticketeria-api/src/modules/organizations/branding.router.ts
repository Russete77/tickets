/**
 * Router de branding.
 * GET /branding/by-domain — público, usado pelo frontend no boot.
 * PUT /branding/:organizationId — admin only.
 *
 * Auditoria CTO 2026-05 — gap 4.12
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { requireOrganizationRole } from '../../middleware/organization';
import { asyncHandler } from '../../shared/asyncHandler';
import { BrandingService, brandingSchema } from './branding.service';

export const brandingRouter = Router();

brandingRouter.get(
  '/by-domain',
  asyncHandler(async (req, res) => {
    const host = (req.query.host as string) || req.hostname;
    const data = await BrandingService.resolveByDomain(host);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, data });
  }),
);

brandingRouter.put(
  '/:organizationId',
  authenticate,
  requireOrganizationRole('admin'),
  validate({
    params: z.object({ organizationId: z.string().uuid() }),
    body: brandingSchema.extend({
      domain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const updated = await BrandingService.update(String(req.params.organizationId), req.body);
    res.json({ success: true, data: updated });
  }),
);
