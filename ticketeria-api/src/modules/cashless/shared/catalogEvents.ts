import { publishBroadcast } from '../../../shared/socketBridge';

export async function emitCatalogUpdated(posId: string): Promise<void> {
  await publishBroadcast(`pos:${posId}`, 'catalog:updated', {
    posId,
    ts: Date.now(),
  });
}

interface StockEventPayload {
  posId: string;
  productId: string;
  name: string;
  stockQty: number;
  threshold: number | null;
}

export async function emitStockLow(
  organizationId: string,
  payload: StockEventPayload,
): Promise<void> {
  await publishBroadcast(`pos:${payload.posId}`, 'stock:low', payload);
  await publishBroadcast(`org:${organizationId}`, 'stock:low', payload);
}

export async function emitStockOut(
  organizationId: string,
  payload: StockEventPayload,
): Promise<void> {
  await publishBroadcast(`pos:${payload.posId}`, 'stock:out', payload);
  await publishBroadcast(`org:${organizationId}`, 'stock:out', payload);
}
