import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@shared/stores/authStore';

interface UseSocketOptions {
  namespace?: string;
  autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { namespace = '', autoConnect = true } = options;
  const { token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Em dev sem backend, não tenta conectar para evitar flood de erros no console
    if (!autoConnect) return;
    if (import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) return;

    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3333';
    const url = `${baseUrl}${namespace}`;

    socketRef.current = io(url, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      autoConnect: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
    });

    // Silencia erros de conexão em dev
    socketRef.current.on('connect_error', () => {
      if (import.meta.env.DEV) {
        socketRef.current?.disconnect();
      }
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [namespace, autoConnect, token]);

  const on = useCallback(<T>(event: string, handler: (data: T) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  const emit = useCallback(<T>(event: string, data?: T) => {
    socketRef.current?.emit(event, data);
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  return { socket: socketRef.current, on, emit, disconnect };
}
