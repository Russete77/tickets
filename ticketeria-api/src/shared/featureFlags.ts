import { redis } from '../config/redis';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * Sistema de feature flags simples e eficaz.
 *
 * - Storage primário: Redis (`{prefix}{flag}` → "on" | "off" | percentage 0-100).
 * - Fallback: variável de ambiente `FF_<UPPER_SNAKE_CASE>` (= "on", "off", "0..100").
 * - Resultado é cacheado em memória por 30s para evitar round-trips em hot paths.
 *
 * Uso típico:
 *   if (await isFeatureEnabled('flash-sale-queue', { userId })) { ... }
 *
 * Para liberação gradual (canary):
 *   - Setar valor numérico 0..100 — % de usuários sorteados pelo hash do userId.
 */

type FlagValue = boolean | number;

const memoryCache = new Map<string, { value: FlagValue; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

function envKeyFor(flag: string): string {
  return `FF_${flag.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`;
}

function parseValue(raw: string | null | undefined): FlagValue | null {
  if (raw == null) return null;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === 'on' || trimmed === 'true' || trimmed === '1') return true;
  if (trimmed === 'off' || trimmed === 'false' || trimmed === '0') return false;
  const num = Number(trimmed);
  if (!Number.isNaN(num) && num >= 0 && num <= 100) return num;
  return null;
}

/**
 * Hash determinístico simples (FNV-1a) para sorteio percentual estável por userId.
 */
function hashToBucket(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

async function readFlag(flag: string): Promise<FlagValue | null> {
  const cached = memoryCache.get(flag);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let value: FlagValue | null = null;

  // 1) Redis
  try {
    const raw = await redis.get(`${env.FEATURE_FLAGS_PREFIX}${flag}`);
    value = parseValue(raw);
  } catch (err) {
    logger.warn({ err }, `[featureFlags] falha ao ler flag "${flag}" do Redis`);
  }

  // 2) Fallback env
  if (value === null) {
    value = parseValue(process.env[envKeyFor(flag)]);
  }

  // 3) Default: desligada
  if (value === null) {
    value = false;
  }

  memoryCache.set(flag, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export interface FlagContext {
  userId?: string;
  email?: string;
}

/**
 * Verifica se uma feature flag está habilitada para o contexto fornecido.
 * - boolean: liga/desliga global.
 * - 0..100:  percentual de usuários sorteados pelo userId (estável).
 */
export async function isFeatureEnabled(flag: string, context: FlagContext = {}): Promise<boolean> {
  const value = await readFlag(flag);
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'number') return false;

  // Percentual: usa userId estável; se ausente, desliga (avoid leaking to anônimos)
  const seed = context.userId ?? context.email;
  if (!seed) return false;

  return hashToBucket(`${flag}:${seed}`) < value;
}

/**
 * Define o valor de uma feature flag em runtime (admin/debug).
 */
export async function setFeatureFlag(flag: string, value: FlagValue): Promise<void> {
  const stored = typeof value === 'boolean' ? (value ? 'on' : 'off') : String(value);
  await redis.set(`${env.FEATURE_FLAGS_PREFIX}${flag}`, stored);
  memoryCache.delete(flag);
  logger.info(`[featureFlags] flag "${flag}" atualizada para ${stored}`);
}

/**
 * Lista todas as flags conhecidas (Redis only).
 * Útil para painel admin.
 */
export async function listFeatureFlags(): Promise<Record<string, FlagValue>> {
  const result: Record<string, FlagValue> = {};
  const pattern = `${env.FEATURE_FLAGS_PREFIX}*`;
  const stream = redis.scanStream({ match: pattern, count: 100 });

  for await (const keys of stream) {
    if (keys.length === 0) continue;
    const values = await redis.mget(...keys);
    keys.forEach((key: string, idx: number) => {
      const parsed = parseValue(values[idx]);
      if (parsed !== null) {
        result[key.slice(env.FEATURE_FLAGS_PREFIX.length)] = parsed;
      }
    });
  }

  return result;
}
