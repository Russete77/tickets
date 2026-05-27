import { SecureStorage, StorageKey } from './storage';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3333/api';

export type VenueZoneKind = 'general' | 'vip' | 'bar' | 'bathroom' | 'first_aid' | 'stage' | 'exit';

export interface VenueZone {
  id: string;
  name: string;
  polygon: Array<[number, number]>;
  capacity?: number;
  color?: string;
  kind?: VenueZoneKind;
}

export interface VenueMap {
  id: string;
  eventId: string;
  svgUrl: string | null;
  zones: VenueZone[];
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await SecureStorage.getItem(StorageKey.AUTH_TOKEN);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getVenueMap(eventId: string): Promise<VenueMap | null> {
  const res = await fetch(`${API_BASE}/v1/events/${eventId}/map`, {
    headers: await authHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { success: boolean; data: VenueMap };
  return json.data;
}

export interface ZoneOccupancy {
  zoneId: string;
  name: string;
  current: number;
  capacity: number | null;
  ratio: number | null;
  status: 'green' | 'yellow' | 'red' | 'unknown';
}

export async function getZoneOccupancy(eventId: string): Promise<ZoneOccupancy[]> {
  const res = await fetch(`${API_BASE}/v1/events/${eventId}/zones/occupancy`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { success: boolean; data: ZoneOccupancy[] };
  return json.data;
}
