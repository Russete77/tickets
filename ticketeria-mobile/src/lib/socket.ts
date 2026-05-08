import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { SecureStorage, StorageKey } from './storage';

const API_URL = (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://localhost:3333';

let _socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (_socket?.connected) return _socket;
  const token = await SecureStorage.getItem(StorageKey.AUTH_TOKEN);
  _socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
  });
  return _socket;
}

export async function joinPos(posId: string): Promise<void> {
  const socket = await getSocket();
  socket.emit('pos:join', { posId });
}

export async function onCatalogUpdated(cb: () => void): Promise<() => void> {
  const socket = await getSocket();
  const handler = () => cb();
  socket.on('catalog:updated', handler);
  return () => socket.off('catalog:updated', handler);
}

export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}
