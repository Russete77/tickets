/**
 * Adapter FCM nativo — fallback de Expo Push e suporte para tokens FCM
 * de apps não-Expo (PWA, Capacitor) que produtores enterprise possam usar.
 *
 * Auditoria CTO 2026-05 — gap 4.7
 */
import crypto from 'crypto';
import { logger } from '../../shared/logger';

interface FcmCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

let cached: FcmCredentials | null = null;
function loadCreds(): FcmCredentials | null {
  if (cached) return cached;
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) return null;
  cached = { projectId, clientEmail, privateKey };
  return cached;
}

let accessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(creds: FcmCredentials): Promise<string> {
  if (accessToken && accessToken.expiresAt > Date.now() + 60_000) {
    return accessToken.token;
  }

  // Construir JWT assinado com a private key da service account.
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: creds.clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const base64url = (b: Buffer) =>
    b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const claimB64 = base64url(Buffer.from(JSON.stringify(claim)));
  const signingInput = `${headerB64}.${claimB64}`;

  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(creds.privateKey);
  const jwt = `${signingInput}.${base64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) throw new Error(`FCM oauth ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  accessToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return accessToken.token;
}

export interface FcmPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendFcm(payload: FcmPayload): Promise<{ success: boolean }> {
  const creds = loadCreds();
  if (!creds) {
    logger.debug('FCM não configurado — pulando');
    return { success: false };
  }

  const token = await getAccessToken(creds);
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${creds.projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: payload.token,
          notification: { title: payload.title, body: payload.body },
          data: payload.data,
          android: { priority: 'high' },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { sound: 'default', 'mutable-content': 1 } },
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    logger.warn({ status: res.status, text }, 'FCM send falhou');
    return { success: false };
  }
  return { success: true };
}
