import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useToastStore } from '@shared/stores/toastStore';
import { cashlessApi } from './api';

interface Category {
  id: string;
  eventId: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
}

const empty = { name: '', icon: '', color: '#888888', sortOrder: 0 };

const AdminCategoriesPage: React.FC = () => {
  const { organizationId = '', eventId = '' } = useParams<{ organizationId: string; eventId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [form, setForm] = useState(empty);

  const list = useQuery({
    queryKey: ['cashless-categories', organizationId, eventId],
    queryFn: () =>
      cashlessApi<Category[]>(`/cashless/orgs/${organizationId}/events/${eventId}/categories`),
    enabled: !!organizationId && !!eventId,
  });

  const createMut = useMutation({
    mutationFn: (d: typeof empty) =>
      cashlessApi(`/cashless/orgs/${organizationId}/events/${eventId}/categories`, {
        method: 'POST',
        body: JSON.stringify({ ...d, icon: d.icon || undefined, color: d.color || undefined }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Categoria criada' });
      setForm(empty);
      qc.invalidateQueries({ queryKey: ['cashless-categories', organizationId, eventId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  const reorderMut = useMutation({
    mutationFn: (items: Array<{ id: string; sortOrder: number }>) =>
      cashlessApi(`/cashless/orgs/${organizationId}/events/${eventId}/categories/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cashless-categories', organizationId, eventId] }),
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) =>
      cashlessApi(`/cashless/orgs/${organizationId}/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Categoria arquivada' });
      qc.invalidateQueries({ queryKey: ['cashless-categories', organizationId, eventId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  function move(idx: number, dir: -1 | 1) {
    const arr = list.data ? [...list.data] : [];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    const a = arr[idx]!, b = arr[j]!;
    reorderMut.mutate([
      { id: a.id, sortOrder: b.sortOrder },
      { id: b.id, sortOrder: a.sortOrder },
    ]);
  }

  if (list.isLoading) return <Spinner size="lg" />;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1>Categorias</h1>

      <section style={{ marginTop: 24, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
        <h3>Nova categoria</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <label>
            <div>Nome</div>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cervejas" />
          </label>
          <label>
            <div>Ícone (emoji)</div>
            <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🍺" />
          </label>
          <label>
            <div>Cor</div>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              style={{ width: '100%', height: 40 }}
            />
          </label>
          <Button onClick={() => createMut.mutate(form)} disabled={!form.name || createMut.isPending}>
            Criar
          </Button>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>Categorias ({list.data?.length ?? 0})</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {list.data?.map((c, i) => (
            <li
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                border: '1px solid #eee',
                borderRadius: 6,
                marginBottom: 8,
              }}
            >
              <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 4, background: c.color ?? '#888' }} />
              <strong style={{ flex: 1 }}>
                {c.icon} {c.name}
              </strong>
              <Button onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
              <Button onClick={() => move(i, 1)} disabled={i === (list.data?.length ?? 0) - 1}>↓</Button>
              <Button
                onClick={() => {
                  if (confirm(`Arquivar "${c.name}"?`)) archiveMut.mutate(c.id);
                }}
              >
                Arquivar
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminCategoriesPage;
