import { z } from 'zod';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  API_VERSION: z.string().default('v1'),
  API_BASE_URL: z.string().url().default('http://localhost:3333'),

  // Frontend URLs (CORS)
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  ADMIN_URL: z.string().url().default('http://localhost:5174'),
  CHECKIN_URL: z.string().url().default('http://localhost:5175'),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // JWT - RS256 asymmetric keys (base64-encoded PEM)
  JWT_PRIVATE_KEY_BASE64: z.string().min(1),
  JWT_PUBLIC_KEY_BASE64: z.string().min(1),
  // JWT - symmetric secret for refresh tokens only
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Platform Security
  PLATFORM_SECRET: z.string().min(32),

  // Asaas
  ASAAS_API_URL: z.string().min(1),
  ASAAS_API_KEY: z.string().min(1),
  ASAAS_WEBHOOK_SECRET: z.string().min(1),
  ASAAS_WEBHOOK_URL: z.string().optional(),
  ASAAS_WALLET_ID: z.string().min(1),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('ticketeria'),
  R2_PUBLIC_URL: z.string().optional(),

  // Resend
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().default('noreply@ticketeria.com.br'),
  RESEND_FROM_NAME: z.string().default('Ticketeria'),

  // Sentry
  SENTRY_DSN: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Operational alerts (capacity overflow → security/ops team)
  SECURITY_ALERT_EMAIL: z.string().email().optional(),
  OPS_ALERT_EMAIL: z.string().email().optional(),

  // Webhook external integrators (Sympla, Ingresso.com)
  EXTERNAL_WEBHOOK_SECRET: z.string().optional(),

  // Feature flags storage prefix
  FEATURE_FLAGS_PREFIX: z.string().default('feature:'),

  // ============================================
  // Auditoria CTO 2026-05 — env vars novas (todas opcionais)
  // ============================================

  // Pagar.me — gateway secundário (gap 4.6)
  PAGARME_API_URL: z.string().optional(),
  PAGARME_SECRET_KEY: z.string().optional(),
  PAGARME_RECIPIENT_ID: z.string().optional(),
  PAGARME_WEBHOOK_SECRET: z.string().optional(),

  // Meilisearch (gap 4.3)
  MEILI_HOST: z.string().optional(),
  MEILI_MASTER_KEY: z.string().optional(),

  // FCM (gap 4.7)
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Variáveis de ambiente inválidas:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
