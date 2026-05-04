import React, { useEffect } from 'react';
import { Providers } from './providers';
import { AppRouter } from './router';
import { ToastContainer } from '@shared/ui/Toast/ToastContainer';
import { useToastStore } from '@shared/stores/toastStore';
import { loadBranding } from '@shared/lib/branding';

const ToastBridge: React.FC = () => {
  const { toasts, removeToast } = useToastStore();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
};

const App: React.FC = () => {
  // White-label boot — Auditoria CTO 2026-05 (gap 4.12)
  useEffect(() => {
    void loadBranding();
  }, []);

  return (
    <Providers>
      <AppRouter />
      <ToastBridge />
    </Providers>
  );
};

export default App;
