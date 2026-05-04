/**
 * Branding / white-label.
 * Auditoria CTO 2026-05 — gap 4.12
 */
import { z } from 'zod';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { BadRequestError } from '../../shared/errors';
import type { Prisma } from '../../generated/prisma/client';

const CACHE_TTL_SECONDS = 300;
const CACHE_PREFIX = 'branding:domain:';

export const brandingSchema = z.object({
  logoUrl: z.url().optional(),
  faviconUrl: z.url().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  fontFamily: z.string().max(80).optional(),
  metaDescription: z.string().max(280).optional(),
  socialImage: z.url().optional(),
});

export type Branding = z.infer<typeof brandingSchema>;

interface ResolvedBranding {
  matched: boolean;
  organizationId?: string;
  slug?: string;
  name?: string;
  locale?: string;
  currency?: string;
  branding?: Branding | null;
}

export class BrandingService {
  static async resolveByDomain(host: string): Promise<ResolvedBranding> {
    const normalized = host.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const cacheKey = `${CACHE_PREFIX}${normalized}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as ResolvedBranding;

    const org = await prisma.organization.findUnique({
      where: { domain: normalized },
      select: {
        id: true,
        slug: true,
        name: true,
        branding: true,
        defaultLocale: true,
        defaultCurrency: true,
      },
    });
    if (!org) {
      const empty: ResolvedBranding = { matched: false };
      await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(empty));
      return empty;
    }

    const result: ResolvedBranding = {
      matched: true,
      organizationId: org.id,
      slug: org.slug,
      name: org.name,
      locale: org.defaultLocale,
      currency: org.defaultCurrency,
      branding: (org.branding as Branding | null) ?? null,
    };
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
    return result;
  }

  static async update(organizationId: string, input: Branding & { domain?: string }) {
    const branding = brandingSchema.parse({
      logoUrl: input.logoUrl,
      faviconUrl: input.faviconUrl,
      primaryColor: input.primaryColor,
      accentColor: input.accentColor,
      fontFamily: input.fontFamily,
      metaDescription: input.metaDescription,
      socialImage: input.socialImage,
    });

    if (input.domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input.domain)) {
      throw new BadRequestError('Domínio inválido');
    }

    const old = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { domain: true },
    });

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        branding: branding as Prisma.InputJsonValue,
        ...(input.domain ? { domain: input.domain.toLowerCase() } : {}),
      },
    });

    if (old?.domain) await redis.del(`${CACHE_PREFIX}${old.domain}`);
    if (updated.domain) await redis.del(`${CACHE_PREFIX}${updated.domain}`);

    return updated;
  }

  static toCssVars(branding: Branding | null | undefined): string {
    const b = branding ?? {};
    const lines: string[] = [];
    if (b.primaryColor) lines.push(`--brand-primary: ${b.primaryColor};`);
    if (b.accentColor) lines.push(`--brand-accent: ${b.accentColor};`);
    if (b.fontFamily) lines.push(`--brand-font: ${b.fontFamily};`);
    return `:root{${lines.join('')}}`;
  }
}
