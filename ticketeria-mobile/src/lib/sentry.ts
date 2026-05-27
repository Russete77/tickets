/**
 * Sentry para mobile (Expo). Inicializado em _layout.tsx.
 * Setup pleno requer `@sentry/react-native` instalado e EAS build com Sentry plugin.
 * No-op em DEV se EXPO_PUBLIC_SENTRY_DSN não configurado.
 */
type SentryLike = {
  init: (cfg: Record<string, unknown>) => void;
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
  captureMessage: (msg: string, ctx?: Record<string, unknown>) => void;
  setUser: (u: { id?: string; email?: string } | null) => void;
};

const noopSentry: SentryLike = {
  init: () => undefined,
  captureException: (err) => console.warn('[Sentry stub]', err),
  captureMessage: (msg) => console.info('[Sentry stub]', msg),
  setUser: () => undefined,
};

let sentry: SentryLike = noopSentry;

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.log('[Sentry] DSN não configurado — usando stub.');
    return;
  }
  try {
    const mod = require('@sentry/react-native') as SentryLike | undefined;
    if (mod?.init) {
      mod.init({
        dsn,
        environment: process.env.EXPO_PUBLIC_ENVIRONMENT ?? 'development',
        tracesSampleRate: process.env.EXPO_PUBLIC_ENVIRONMENT === 'production' ? 0.2 : 1.0,
      });
      sentry = mod;
    }
  } catch {
    console.log('[Sentry] @sentry/react-native não instalado — usando stub.');
  }
}

export const Sentry: SentryLike = new Proxy({} as SentryLike, {
  get(_target, prop: keyof SentryLike) {
    return sentry[prop];
  },
});
