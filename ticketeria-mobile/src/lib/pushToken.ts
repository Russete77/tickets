/**
 * Push token helper — registra token (Expo Push ou FCM nativo) na API.
 *
 * Estratégia:
 *   1. Tenta registrar Expo Push token (Expo SDK).
 *   2. Se falhar (build sem Expo Push), tenta FCM token nativo.
 *   3. Envia pra `/api/v1/users/push-token` com tipo identificado.
 *
 * Auditoria CTO 2026-05 — gap 4.7
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://localhost:3333/api';

export interface PushTokenResult {
  token: string;
  type: 'expo' | 'fcm';
}

/**
 * Solicita permissão e captura token.
 */
export async function getPushToken(projectId?: string): Promise<PushTokenResult | null> {
  if (!Device.isDevice) {
    console.warn('Push token só funciona em device físico');
    return null;
  }

  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  // Tenta Expo Push primeiro (build padrão).
  try {
    const expoToken = await Notifications.getExpoPushTokenAsync({
      projectId:
        projectId ??
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId,
    });
    if (expoToken?.data) return { token: expoToken.data, type: 'expo' };
  } catch (err) {
    console.warn('Expo push token falhou, tentando FCM nativo', err);
  }

  // Fallback: FCM nativo (apps non-Expo / bare workflow).
  try {
    const dev = await Notifications.getDevicePushTokenAsync();
    if (dev?.data) return { token: String(dev.data), type: 'fcm' };
  } catch (err) {
    console.warn('FCM device token falhou', err);
  }

  return null;
}

/**
 * Envia o token pra API.
 */
export async function registerPushToken(jwt: string): Promise<boolean> {
  const result = await getPushToken();
  if (!result) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/users/push-token`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        token: result.token,
        type: result.type,
        platform: Device.osName,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Falha ao registrar push token na API', err);
    return false;
  }
}
