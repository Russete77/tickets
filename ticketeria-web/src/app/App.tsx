import React from 'react';
import { Providers } from './providers';
import { AppRouter } from './router';
import { ToastContainer } from '@shared/ui/Toast/ToastContainer';
import { useToastStore } from '@shared/stores/toastStore';

const ToastBridge: React.FC = () => {
  const { toasts, removeToast } = useToastStore();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
};

const App: React.FC = () => {
  return (
    <Providers>
      <AppRouter />
      <ToastBridge />
    </Providers>
  );
};

export default App;
