import * as Crypto from 'expo-crypto';
import { SecureStorage, StorageKey } from './storage';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3333/api';

export type CustomerOrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface CustomerOrderItem {
  productId: string;
  name: string;
  qty: number;
  priceCents: number;
  controlsStock?: boolean;
}

export interface CustomerOrder {
  id: string;
  userId: string;
  eventId: string;
  posId: string;
  status: CustomerOrderStatus;
  totalCents: number;
  items: CustomerOrderItem[];
  pickupCode: string;
  walletTxId: string | null;
  createdAt: string;
  preparingAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

export interface PaginatedOrders {
  data: CustomerOrder[];
  pagination: { nextCursor: string | null; hasMore: boolean };
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  const json = (await res.json()) as { success: boolean; data: T };
  return json.data;
}

export async function createCustomerOrder(input: {
  eventId: string;
  posId: string;
  items: Array<{ productId: string; qty: number }>;
}): Promise<CustomerOrder> {
  const idempotencyKey = Crypto.randomUUID();
  const res = await fetch(`${API_BASE}/v1/customer-orders`, {
    method: 'POST',
    headers: await authHeaders({ 'Idempotency-Key': idempotencyKey }),
    body: JSON.stringify(input),
  });
  return unwrap<CustomerOrder>(res);
}

export async function getMyCustomerOrders(params: {
  cursor?: string;
  limit?: number;
  status?: CustomerOrderStatus;
  eventId?: string;
}): Promise<PaginatedOrders> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  if (params.eventId) qs.set('eventId', params.eventId);
  const res = await fetch(`${API_BASE}/v1/customer-orders/me?${qs.toString()}`, {
    headers: await authHeaders(),
  });
  return unwrap<PaginatedOrders>(res);
}

export async function cancelCustomerOrder(orderId: string): Promise<CustomerOrder> {
  const res = await fetch(`${API_BASE}/v1/customer-orders/${orderId}/cancel`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  return unwrap<CustomerOrder>(res);
}

export interface PosProductLite {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  imageUrl?: string;
  isAvailable: boolean;
  stockQty?: number | null;
}

export async function getPosCatalog(posId: string): Promise<PosProductLite[]> {
  const res = await fetch(`${API_BASE}/v1/cashless/pos/${posId}/products`, {
    headers: await authHeaders(),
  });
  return unwrap<PosProductLite[]>(res);
}
