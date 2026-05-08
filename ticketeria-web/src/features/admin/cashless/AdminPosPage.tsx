import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useToastStore } from '@shared/stores/toastStore';
import { cashlessApi } from './api';

interface Pos {
  id: string;
  eventId: string;
  name: string;
  type: 'bar' | 'mobile' | 'totem' | 'vip_lounge' | 'food_truck' | 'backstage_pos';
  location?: string;
  isActive: boolean;
  isArchived: boolean;
}

const POS_TYPES: Pos['type'][] = ['bar', 'mobile', 'totem', 'vip_lounge', 'food_truck', 'backstage_pos'];

const empty = { name: '', type: 'bar' as Pos['type'], location: '', isActive: true };

const AdminPosPage: React.FC = () => {
  const { organizationId = '', eventId = '' } = useParams<{ organizationId: string; eventId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [editing, setEditing] = useState<Pos | null>(null);
  const [form, setForm] = useState(empty);

  const list = useQuery({
    queryKey: ['cashless-pos', organizationId, eventId],
    queryFn: () => cashlessApi<Pos[]>(`/cashless/orgs/${organizationId}/events/${eventId}/pos`),
    enabled: !!organizationId && !!eventId,
  });

  const createMut = useMutation({
    mutationFn: (data: typeof empty) =>
      cashlessApi(`/cashless/orgs/${organizationId}/events/${eventId}/pos`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'POS criado' });
      setForm(empty);
      qc.invalidateQueries({ queryKey: ['cashless-pos', organizationId, eventId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pos> }) =>
      cashlessApi(`/cashless/orgs/${organizationId}/pos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'POS atualizado' });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['cashless-pos', organizationId, eventId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) =>
      cashlessApi(`/cashless/orgs/${organizationId}/pos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'POS arquivado' });
      qc.invalidateQueries({ queryKey: ['cashless-pos', organizationId, eventId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  if (list.isLoading) return <Spinner size="lg" />;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <h1>Pontos de venda</h1>

      <section style={{ marginTop: 24, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
        <h3>Novo POS</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 12, alignItems: 'end' }}>
          <label>
            <div>Nome</div>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bar Central" />
          </label>
          <label>
            <div>Tipo</div>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as Pos['type'] })}
              style={{ width: '100%', padding: 8 }}
            >
              {POS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            <div>Local (opcional)</div>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Hall principal" />
          </label>
          <Button onClick={() => createMut.mutate(form)} disabled={!form.name || createMut.isPending}>
            Criar
          </Button>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>POS existentes ({list.data?.length ?? 0})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: 8 }}>Nome</th>
              <th style={{ padding: 8 }}>Tipo</th>
              <th style={{ padding: 8 }}>Local</th>
              <th style={{ padding: 8 }}>Ativo</th>
              <th style={{ padding: 8 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 8 }}>{p.name}</td>
                <td style={{ padding: 8 }}>{p.type}</td>
                <td style={{ padding: 8 }}>{p.location ?? '—'}</td>
                <td style={{ padding: 8 }}>{p.isActive ? '✓' : '—'}</td>
                <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                  <Button onClick={() => setEditing(p)}>Editar</Button>
                  <Button
                    onClick={() => {
                      if (confirm(`Arquivar POS "${p.name}"?`)) archiveMut.mutate(p.id);
                    }}
                  >
                    Arquivar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editing && (
        <dialog open style={{ position: 'fixed', top: '20%', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3>Editar {editing.name}</h3>
          <label>
            <div>Nome</div>
            <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label>
            <div>Local</div>
            <Input value={editing.location ?? ''} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            <input
              type="checkbox"
              checked={editing.isActive}
              onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
            /> Ativo
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button
              onClick={() =>
                updateMut.mutate({
                  id: editing.id,
                  data: { name: editing.name, location: editing.location, isActive: editing.isActive },
                })
              }
            >
              Salvar
            </Button>
            <Button onClick={() => setEditing(null)}>Cancelar</Button>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default AdminPosPage;
