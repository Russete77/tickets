/**
 * Tela: Webhook outbound subscriptions.
 * Auditoria CTO 2026-05 — gap 4.10
 */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useToastStore } from '@shared/stores/toastStore';

const API = import.meta.env.VITE_API_BASE_URL ?? '/api';

const EVENT_TYPES = [
  'event_published',
  'event_updated',
  'order_paid',
  'order_refunded',
  'ticket_issued',
  'ticket_checked_in',
  'ticket_transferred',
  'cashless_topup',
  'cashless_purchase',
  'cashless_refund',
  'guest_checked_in',
] as const;

interface Subscription {
  id: string;
  url: string;
  eventTypes: string[];
  isActive: boolean;
  description: string | null;
  createdAt: string;
}

interface Delivery {
  id: string;
  eventType: string;
  status: 'pending' | 'delivered' | 'failed' | 'abandoned';
  attempts: number;
  responseStatus: number | null;
  lastError: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth.accessToken');
  const res = await fetch(`${API}/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { success: boolean; data: T };
  return json.data;
}

const AdminWebhooksPage: React.FC = () => {
  const { organizationId = '' } = useParams<{ organizationId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [eventTypes, setEventTypes] = useState<string[]>(['order_paid', 'ticket_checked_in']);
  const [openSub, setOpenSub] = useState<string | null>(null);

  const { data: subs, isLoading } = useQuery({
    queryKey: ['webhook-subs', organizationId],
    queryFn: () =>
      api<Subscription[]>(`/webhooks/outbound/${organizationId}/subscriptions`),
    enabled: !!organizationId,
  });

  const { data: deliveries } = useQuery({
    queryKey: ['webhook-deliveries', organizationId, openSub],
    queryFn: () =>
      api<Delivery[]>(
        `/webhooks/outbound/${organizationId}/subscriptions/${openSub}/deliveries`,
      ),
    enabled: !!openSub,
  });

  const createMut = useMutation({
    mutationFn: () =>
      api(`/webhooks/outbound/${organizationId}/subscriptions`, {
        method: 'POST',
        body: JSON.stringify({ url, eventTypes, description: description || undefined }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Webhook criado' });
      setUrl('');
      setDescription('');
      qc.invalidateQueries({ queryKey: ['webhook-subs', organizationId] });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      api(`/webhooks/outbound/${organizationId}/subscriptions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhook-subs', organizationId] }),
  });

  if (isLoading) return <Spinner size="lg" />;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1>Webhooks</h1>
      <p style={{ color: '#666' }}>
        Receba eventos do PulsePass em sua URL. Cada delivery vem com header{' '}
        <code>X-PulsePass-Signature: sha256=…</code> (HMAC do secret retornado na criação).
      </p>

      <section style={{ marginTop: 24, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Nova subscription</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            placeholder="https://meu-app.com/webhooks/pulsepass"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Input
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
          />
          <div>
            <strong>Eventos:</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {EVENT_TYPES.map((e) => (
                <label key={e} style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={eventTypes.includes(e)}
                    onChange={(ev) => {
                      setEventTypes(
                        ev.target.checked ? [...eventTypes, e] : eventTypes.filter((x) => x !== e),
                      );
                    }}
                  />
                  <code style={{ marginLeft: 4 }}>{e}</code>
                </label>
              ))}
            </div>
          </div>
          <Button
            onClick={() => createMut.mutate()}
            disabled={!url || eventTypes.length === 0 || createMut.isPending}
          >
            {createMut.isPending ? 'Criando...' : 'Criar webhook'}
          </Button>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Subscriptions ativas</h2>
        {subs?.length === 0 && <p style={{ color: '#666' }}>Nenhuma subscription cadastrada.</p>}
        {subs?.map((s) => (
          <div
            key={s.id}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <code style={{ fontSize: 14 }}>{s.url}</code>
                {s.description && <div style={{ color: '#666' }}>{s.description}</div>}
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                  {s.eventTypes.join(' · ')}
                </div>
              </div>
              <div>
                <button
                  onClick={() => setOpenSub(openSub === s.id ? null : s.id)}
                  style={{ marginRight: 8 }}
                >
                  {openSub === s.id ? 'Fechar log' : 'Ver log'}
                </button>
                <button
                  onClick={() => deleteMut.mutate(s.id)}
                  style={{ color: 'crimson', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Excluir
                </button>
              </div>
            </div>
            {openSub === s.id && deliveries && (
              <table style={{ width: '100%', marginTop: 12, fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <th align="left">Evento</th>
                    <th align="left">Status</th>
                    <th align="left">HTTP</th>
                    <th align="left">Tentativas</th>
                    <th align="left">Quando</th>
                    <th align="left">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.slice(0, 50).map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td>
                        <code>{d.eventType}</code>
                      </td>
                      <td>
                        <span
                          style={{
                            color:
                              d.status === 'delivered'
                                ? 'green'
                                : d.status === 'failed'
                                  ? 'orange'
                                  : d.status === 'abandoned'
                                    ? 'crimson'
                                    : '#888',
                          }}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td>{d.responseStatus ?? '—'}</td>
                      <td>{d.attempts}</td>
                      <td>{new Date(d.createdAt).toLocaleString()}</td>
                      <td style={{ color: 'crimson', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {d.lastError ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </section>
    </div>
  );
};

export default AdminWebhooksPage;
