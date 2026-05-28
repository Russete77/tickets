import React from 'react';
import ReactDOM from 'react-dom/client';
import { initSentry, Sentry } from '@shared/lib/sentry';
import App from '@app/App';
import '@shared/styles/reset.css';
import '@shared/styles/tokens.css';
import '@shared/styles/typography.css';
import '@shared/styles/animations.css';
// PulsePass Design System v3 — Premium Glass
// Mantém os tokens legacy do shared/styles acima pra compatibilidade,
// e adiciona os tokens novos do DS (--pp-*) por cima sem conflito de namespace.
import './design-system/tokens.css';
// Aliases (--tl-*) → (--pp-*) — atualiza visual de TODOS os CSS modules existentes
// sem precisar reescrever cada arquivo.
import './design-system/aliases.css';

// Initialize Sentry at the very top
initSentry();

// PulsePass v3 — força dark em toda a ticketeria.
// O DS é desenhado pra dark (imersivo, cinematográfico). Admin/produtor
// terá toggle dedicado depois; consumer/cliente é sempre dark.
document.documentElement.setAttribute('data-theme', 'dark');

async function enableMocking() {
  // Ativa mock apenas em desenvolvimento (sem backend)
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    return worker.start({
      onUnhandledRequest: 'bypass', // requisições não mockadas passam direto
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// Wrap App with Sentry ProfiledApp for error boundary and performance monitoring
const ProfiledApp = Sentry.withProfiler(App);

enableMocking().then(() => {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ProfiledApp />
    </React.StrictMode>
  );
});
