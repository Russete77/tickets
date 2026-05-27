import { SecureStorage, StorageKey } from './storage';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3333/api';

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  tier: number;
  iconUrl: string | null;
  progress: number;
  unlockedAt: string | null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await SecureStorage.getItem(StorageKey.AUTH_TOKEN);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function listAchievements(): Promise<Achievement[]> {
  const res = await fetch(`${API_BASE}/v1/achievements/me`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { success: boolean; data: Achievement[] };
  return json.data;
}

export async function evaluateAchievements(): Promise<{ unlocked: string[]; progress: Record<string, number> }> {
  const res = await fetch(`${API_BASE}/v1/achievements/me/evaluate`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { success: boolean; data: { unlocked: string[]; progress: Record<string, number> } };
  return json.data;
}
