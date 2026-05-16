import * as SecureStore from 'expo-secure-store';

const KEY_DEVICE_TOKEN = 'POS_DEVICE_TOKEN';
const KEY_POS_ID = 'POS_DEVICE_POSID';
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3333/api') + '/v1';

export async function getStoredDeviceToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_DEVICE_TOKEN);
}

export async function getStoredPosId(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_POS_ID);
}

export async function clearDevice(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_DEVICE_TOKEN);
  await SecureStore.deleteItemAsync(KEY_POS_ID);
}

export async function redeemPairingCode(
  pairingCode: string,
): Promise<{ deviceToken: string; posId: string }> {
  const res = await fetch(`${API_BASE}/pos-devices/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pairingCode }),
  });
  if (!res.ok) throw new Error(`Pareamento falhou (${res.status})`);
  const { data } = (await res.json()) as { data: { deviceToken: string; posId: string } };
  await SecureStore.setItemAsync(KEY_DEVICE_TOKEN, data.deviceToken);
  await SecureStore.setItemAsync(KEY_POS_ID, data.posId);
  return data;
}

export async function deviceFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getStoredDeviceToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Device-Token': token } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401) {
    await clearDevice();
    throw new Error('DEVICE_REVOKED');
  }
  if (!res.ok) throw new Error(`${res.status}`);
  const json = (await res.json()) as { data: T };
  return json.data;
}

export async function sendHeartbeat(payload: {
  appVersion?: string; online?: boolean; pendingQueue?: number; battery?: number;
}): Promise<void> {
  try {
    await deviceFetch('/pos-devices/heartbeat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort: heartbeat nunca bloqueia operação
  }
}

export async function operatorLogin(
  pin: string,
): Promise<{ operatorId: string; name: string }> {
  return deviceFetch('/pos-devices/operator-login', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}
