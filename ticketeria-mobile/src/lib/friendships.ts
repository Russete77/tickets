import { SecureStorage, StorageKey } from './storage';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3333/api';

export interface FriendUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface Friendship {
  id: string;
  status: 'pending' | 'accepted' | 'blocked';
  friend: FriendUser;
  createdAt: string;
}

export interface FriendPresent {
  id: string;
  name: string;
  avatarUrl: string | null;
  checkedInAt: string;
}

async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await SecureStorage.getItem(StorageKey.AUTH_TOKEN);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { success: boolean; data: T };
  return json.data;
}

export async function requestFriendship(addressee: string) {
  const res = await fetch(`${API_BASE}/v1/friendships/request`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ addressee }),
  });
  return unwrap<Friendship>(res);
}

export async function acceptFriendship(id: string) {
  const res = await fetch(`${API_BASE}/v1/friendships/${id}/accept`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  return unwrap<Friendship>(res);
}

export async function rejectFriendship(id: string) {
  const res = await fetch(`${API_BASE}/v1/friendships/${id}/reject`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  return unwrap<Friendship>(res);
}

export async function listFriendships(status: 'accepted' | 'pending' = 'accepted') {
  const res = await fetch(`${API_BASE}/v1/friendships/me?status=${status}`, {
    headers: await authHeaders(),
  });
  return unwrap<Friendship[]>(res);
}

export async function friendsPresent(eventId: string) {
  const res = await fetch(`${API_BASE}/v1/events/${eventId}/friends-present`, {
    headers: await authHeaders(),
  });
  return unwrap<FriendPresent[]>(res);
}
