import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_ENVIRONMENT || 'development',
      tracesSampleRate: import.meta.env.VITE_ENVIRONMENT === 'production' ? 0.2 : 1.0,
    });
  }
}

export { Sentry };
