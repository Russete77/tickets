import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/Button/Button';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useToastStore } from '@shared/stores/toastStore';
import { useSocket } from '@shared/hooks/useSocket';
import { cashlessApi } from './api';

type CustomerOrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

interface CustomerOrder {
  id: string;
  userId: string;
  eventId: string;
  posId: string;
  status: CustomerOrderStatus;
  totalCents: number;
  items: Array<{ productId: string; name: string; qty: number; priceCents: number }>;
  pickupCode: string;
  createdAt: string;
  preparingAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

interface PaginatedOrders {
  data: CustomerOrder[];
  pagination: { nextCursor: string | null; hasMore: boolean };
}

interface Pos {
  id: string;
  name: string;
}

const COLUMNS: Array<{ status: CustomerOrderStatus; label: string; color: string; next?: CustomerOrderStatus; nextLabel?: string }> = [
  { status: 'pending', label: 'Aguardando', color: '#9ca3af', next: 'preparing', nextLabel: 'Iniciar preparo' },
  { status: 'preparing', label: 'Em preparo', color: '#f59e0b', next: 'ready', nextLabel: 'Marcar pronto' },
  { status: 'ready', label: 'Pronto', color: '#10b981', next: 'delivered', nextLabel: 'Confirmar retirada' },
];

const ACTIVE_STATUSES = 'pending,preparing,ready';

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  return `há ${h}h`;
}

const AdminOrdersQueuePage: React.FC = () => {
  const { organizationId = '', eventId = '' } = useParams<{ organizationId: string; eventId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [filterPos, setFilterPos] = useState<string>('');
  const { on } = useSocket();

  const posList = useQuery({
    queryKey: ['cashless-pos', organizationId, eventId],
    queryFn: () => cashlessApi<Pos[]>(`/cashless/orgs/${organizationId}/events/${eventId}/pos`),
    enabled: !!organizationId && !!eventId,
  });

  const queueQ = useQuery({
    queryKey: ['customer-orders-admin', organizationId, eventId, filterPos],
    queryFn: () => {
      const qs = new URLSearchParams({ organizationId, status: ACTIVE_STATUSES, limit: '100' });
      if (eventId) qs.set('eventId', eventId);
      if (filterPos) qs.set('posId', filterPos);
      return cashlessApi<PaginatedOrders>(`/customer-orders/admin?${qs.toString()}`);
    },
    enabled: !!organizationId,
    refetchInterval: 10000,
  });

  const advanceMut = useMutation({
    mutationFn: ({ id, next }: { id: string; next: CustomerOrderStatus }) =>
      cashlessApi<CustomerOrder>(`/customer-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ organizationId, status: next }),
      }),
    onSuccess: (order) => {
      addToast({ kind: 'success', message: `Pedido ${order.pickupCode} → ${order.status}` });
      void qc.invalidateQueries({ queryKey: ['customer-orders-admin', organizationId] });
    },
    onError: (e: Error) => addToast({ kind: 'error', message: e.message }),
  });

  useEffect(() => {
    if (!organizationId) return;
    const offNew = on('customer_order:new', () => {
      void qc.invalidateQueries({ queryKey: ['customer-orders-admin', organizationId] });
    });
    const offStatus = on('customer_order:status', () => {
      void qc.invalidateQueries({ queryKey: ['customer-orders-admin', organizationId] });
    });
    return () => {
      offNew();
      offStatus();
    };
  }, [on, qc, organizationId]);

  const grouped = useMemo(() => {
    const orders = queueQ.data?.data ?? [];
    const map: Record<CustomerOrderStatus, CustomerOrder[]> = {
      pending: [], preparing: [], ready: [], delivered: [], cancelled: [],
    };
    for (const o of orders) map[o.status].push(o);
    return map;
  }, [queueQ.data]);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
      <h1>Pedidos pelo app</h1>
      <p style={{ color: '#666' }}>Fila ao vivo dos pedidos que os clientes fizeram pelo app. Avance status com 1 clique.</p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '16px 0' }}>
        <label style={{ fontSize: 14, color: '#555' }}>Bar:</label>
        <select
          value={filterPos}
          onChange={(e) => setFilterPos(e.target.value)}
          style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="">Todos</option>
          {posList.data?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => queueQ.refetch()}>Atualizar</Button>
      </div>

      {queueQ.isLoading ? (
        <Spinner size="lg" />
      ) : queueQ.isError ? (
        <p style={{ color: '#ef4444' }}>Erro ao carregar a fila.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {COLUMNS.map((col) => (
            <Column
              key={col.status}
              title={col.label}
              color={col.color}
              orders={grouped[col.status]}
              nextLabel={col.nextLabel}
              onAdvance={col.next ? (id) => advanceMut.mutate({ id, next: col.next! }) : undefined}
              isLoading={advanceMut.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ColumnProps {
  title: string;
  color: string;
  orders: CustomerOrder[];
  nextLabel?: string;
  onAdvance?: (id: string) => void;
  isLoading: boolean;
}

const Column: React.FC<ColumnProps> = ({ title, color, orders, nextLabel, onAdvance, isLoading }) => (
  <div style={{ background: '#f9fafb', borderRadius: 8, padding: 12, minHeight: 400 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ width: 12, height: 12, borderRadius: 6, background: color, display: 'inline-block' }} />
      <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
      <span style={{ marginLeft: 'auto', color: '#666', fontSize: 13 }}>{orders.length}</span>
    </div>
    {orders.length === 0 ? (
      <p style={{ color: '#999', fontSize: 13, textAlign: 'center', marginTop: 32 }}>Sem pedidos.</p>
    ) : (
      orders.map((o) => (
        <div
          key={o.id}
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderLeft: `4px solid ${color}`,
            borderRadius: 6,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong style={{ fontSize: 20, letterSpacing: 2 }}>{o.pickupCode}</strong>
            <span style={{ fontSize: 12, color: '#999' }}>{relativeTime(o.createdAt)}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            {o.items?.map((it, i) => (
              <div key={`${o.id}-${i}`} style={{ fontSize: 13, color: '#333' }}>
                {it.qty}× {it.name}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>{formatBRL(o.totalCents)}</div>
          {onAdvance && nextLabel && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAdvance(o.id)}
              disabled={isLoading}
              style={{ marginTop: 8, width: '100%' }}
            >
              {nextLabel} →
            </Button>
          )}
        </div>
      ))
    )}
  </div>
);

export default AdminOrdersQueuePage;
