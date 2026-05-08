import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useToastStore } from '@shared/stores/toastStore';
import { cashlessApi } from './api';

interface StockRow {
  productId: string;
  name: string;
  posId: string;
  posName: string;
  stockQty: number | null;
  lowStockThreshold: number | null;
  status: 'ok' | 'low' | 'out' | 'untracked';
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  notes?: string;
  createdAt: string;
}

const STATUS_COLOR: Record<StockRow['status'], string> = {
  ok: '#16a34a',
  low: '#f59e0b',
  out: '#dc2626',
  untracked: '#9ca3af',
};

const AdminStockOverviewPage: React.FC = () => {
  const { organizationId = '', eventId = '' } = useParams<{ organizationId: string; eventId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [drawer, setDrawer] = useState<StockRow | null>(null);
  const [moveType, setMoveType] = useState<'stock_entry' | 'adjustment' | 'loss'>('stock_entry');
  const [moveQty, setMoveQty] = useState('');
  const [moveNotes, setMoveNotes] = useState('');

  const overview = useQuery({
    queryKey: ['cashless-stock', organizationId, eventId],
    queryFn: () => cashlessApi<StockRow[]>(`/cashless/orgs/${organizationId}/events/${eventId}/stock`),
    enabled: !!organizationId && !!eventId,
  });

  const movements = useQuery({
    queryKey: ['cashless-stock-movements', drawer?.productId],
    queryFn: () =>
      cashlessApi<Movement[]>(`/cashless/orgs/${organizationId}/products/${drawer!.productId}/stock-movements`),
    enabled: !!drawer?.productId,
  });

  const moveMut = useMutation({
    mutationFn: () =>
      cashlessApi(`/cashless/orgs/${organizationId}/products/${drawer!.productId}/stock-movements`, {
        method: 'POST',
        body: JSON.stringify({
          type: moveType,
          quantity: Number(moveQty),
          notes: moveNotes || undefined,
        }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Movimentação registrada' });
      setMoveQty('');
      setMoveNotes('');
      qc.invalidateQueries({ queryKey: ['cashless-stock', organizationId, eventId] });
      qc.invalidateQueries({ queryKey: ['cashless-stock-movements', drawer?.productId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  if (overview.isLoading) return <Spinner size="lg" />;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1>Estoque</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>POS</th>
            <th style={{ padding: 8 }}>Produto</th>
            <th style={{ padding: 8 }}>Qtd</th>
            <th style={{ padding: 8 }}>Limite</th>
            <th style={{ padding: 8 }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {overview.data?.map((r) => (
            <tr key={r.productId} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: 8 }}>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: STATUS_COLOR[r.status], color: 'white', fontSize: 12 }}>
                  {r.status}
                </span>
              </td>
              <td style={{ padding: 8 }}>{r.posName}</td>
              <td style={{ padding: 8 }}>{r.name}</td>
              <td style={{ padding: 8 }}>{r.stockQty ?? '∞'}</td>
              <td style={{ padding: 8 }}>{r.lowStockThreshold ?? '—'}</td>
              <td style={{ padding: 8 }}>
                <Button onClick={() => setDrawer(r)}>Movimentar</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {drawer && (
        <dialog open style={{ position: 'fixed', top: '5%', maxHeight: '85vh', overflow: 'auto', padding: 24, border: '1px solid #ddd', borderRadius: 8, width: 480 }}>
          <h3>{drawer.name} <small>({drawer.posName})</small></h3>
          <p>Estoque atual: <strong>{drawer.stockQty ?? '∞'}</strong></p>

          <section style={{ marginTop: 16 }}>
            <h4>Nova movimentação</h4>
            <label>
              <div>Tipo</div>
              <select value={moveType} onChange={(e) => setMoveType(e.target.value as typeof moveType)} style={{ width: '100%', padding: 8 }}>
                <option value="stock_entry">Entrada</option>
                <option value="adjustment">Ajuste (+/-)</option>
                <option value="loss">Perda</option>
              </select>
            </label>
            <label>
              <div>Quantidade {moveType === 'adjustment' ? '(use negativo pra reduzir)' : ''}</div>
              <Input type="number" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} />
            </label>
            <label>
              <div>Notas</div>
              <Input value={moveNotes} onChange={(e) => setMoveNotes(e.target.value)} />
            </label>
            <Button onClick={() => moveMut.mutate()} disabled={!moveQty || moveMut.isPending} style={{ marginTop: 12 }}>
              Registrar
            </Button>
          </section>

          <section style={{ marginTop: 24 }}>
            <h4>Histórico</h4>
            {movements.isLoading && <Spinner size="sm" />}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {movements.data?.map((m) => (
                <li key={m.id} style={{ padding: 8, borderBottom: '1px solid #eee', fontSize: 13 }}>
                  <strong>{m.type}</strong> {m.quantity} — {new Date(m.createdAt).toLocaleString('pt-BR')}
                  {m.notes ? <div style={{ color: '#666' }}>{m.notes}</div> : null}
                </li>
              ))}
            </ul>
          </section>

          <Button onClick={() => setDrawer(null)} style={{ marginTop: 16 }}>Fechar</Button>
        </dialog>
      )}
    </div>
  );
};

export default AdminStockOverviewPage;
