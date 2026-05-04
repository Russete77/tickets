/**
 * Entry point do ticketeria-admin (SPA separada).
 * Auditoria CTO 2026-05 — gap 4.8
 *
 * Por enquanto este pacote serve como scaffolding. A migração das
 * páginas admin de `ticketeria-web/src/features/admin/` para cá
 * está documentada em docs/architecture/admin-spa-split.md.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const Placeholder: React.FC<{ feature: string }> = ({ feature }) => (
  <div style={{ padding: 32, fontFamily: 'system-ui' }}>
    <h1>PulsePass Admin</h1>
    <p>
      Feature <code>{feature}</code> será migrada de ticketeria-web/src/features/admin/.
    </p>
    <p>
      Veja <a href="/docs/architecture/admin-spa-split.md">plano de migração</a>.
    </p>
  </div>
);

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<Placeholder feature="dashboard" />} />
        <Route path="/admin/events" element={<Placeholder feature="events" />} />
        <Route path="/admin/orders" element={<Placeholder feature="orders" />} />
        <Route path="/admin/finance" element={<Placeholder feature="finance" />} />
        <Route path="/admin/team" element={<Placeholder feature="team" />} />
        <Route path="/admin/organization" element={<Placeholder feature="organization" />} />
        <Route path="/admin/cashless" element={<Placeholder feature="cashless" />} />
        <Route path="/admin/api-keys" element={<Placeholder feature="api-keys" />} />
        <Route path="/admin/webhooks" element={<Placeholder feature="webhooks" />} />
        <Route path="*" element={<Placeholder feature="404" />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
