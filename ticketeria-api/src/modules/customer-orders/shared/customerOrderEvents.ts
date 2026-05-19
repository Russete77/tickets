import { publishBroadcast } from '../../../shared/socketBridge';

interface OrderEventPayload {
  orderId: string;
  posId: string;
  userId: string;
  status: string;
  totalCents: number;
  pickupCode: string;
  ts: number;
}

export async function emitCustomerOrderNew(orgId: string, p: OrderEventPayload): Promise<void> {
  await publishBroadcast(`pos:${p.posId}`, 'customer_order:new', p);
  await publishBroadcast(`org:${orgId}`, 'customer_order:new', p);
}

export async function emitCustomerOrderStatus(p: OrderEventPayload): Promise<void> {
  await publishBroadcast(`user:${p.userId}`, 'customer_order:status', p);
  await publishBroadcast(`pos:${p.posId}`, 'customer_order:status', p);
}
