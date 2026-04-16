import React from 'react';
import ReactDOM from 'react-dom/client';
import { initSentry, Sentry } from '@shared/lib/sentry';
import App from '@app/App';
import '@shared/styles/reset.css';
import '@shared/styles/tokens.css';
import '@shared/styles/typography.css';
import '@shared/styles/animations.css';

// Initialize Sentry at the very top
initSentry();

// Initialize theme before rendering to prevent flash
function initializeTheme() {
  const THEME_STORAGE_KEY = 'ticketeria-theme';

  // Check localStorage first
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', savedTheme);
    return;
  }

  // Check system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const systemTheme = prefersDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', systemTheme);
}

initializeTheme();

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
