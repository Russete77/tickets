import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useToastStore } from '@shared/stores/toastStore';
import { cashlessApi } from './api';

interface Pos { id: string; name: string }
interface Category { id: string; name: string }
interface Product {
  id: string;
  posId: string;
  name: string;
  description?: string;
  category: string;
  categoryId?: string;
  priceCents: number;
  stockQty?: number | null;
  lowStockThreshold?: number | null;
  imageUrl?: string | null;
  isAvailable: boolean;
  isArchived: boolean;
  sortOrder: number;
}

const PRODUCT_CATEGORIES = ['beer', 'drink', 'cocktail', 'soft_drink', 'water', 'food', 'snack', 'merch', 'service', 'other'];

const emptyForm = {
  name: '',
  description: '',
  category: 'beer',
  categoryId: '',
  priceCents: 0,
  stockQty: '',
  lowStockThreshold: '',
  isAvailable: true,
  sortOrder: 0,
};

const AdminProductsPage: React.FC = () => {
  const { organizationId = '', eventId = '' } = useParams<{ organizationId: string; eventId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [filterPos, setFilterPos] = useState<string>('');
  const [filterCat, setFilterCat] = useState<string>('');
  const [drawer, setDrawer] = useState<{ posId: string; product?: Product } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [cloneDialog, setCloneDialog] = useState<{ targetPosId: string } | null>(null);
  const [cloneSourcePos, setCloneSourcePos] = useState('');
  const [cloneOverwrite, setCloneOverwrite] = useState(false);

  const posList = useQuery({
    queryKey: ['cashless-pos', organizationId, eventId],
    queryFn: () => cashlessApi<Pos[]>(`/cashless/orgs/${organizationId}/events/${eventId}/pos`),
    enabled: !!organizationId && !!eventId,
  });

  const catList = useQuery({
    queryKey: ['cashless-categories', organizationId, eventId],
    queryFn: () => cashlessApi<Category[]>(`/cashless/orgs/${organizationId}/events/${eventId}/categories`),
    enabled: !!organizationId && !!eventId,
  });

  const productsQ = useQuery({
    queryKey: ['cashless-products', organizationId, eventId, filterPos, filterCat],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (filterPos) qs.set('posId', filterPos);
      if (filterCat) qs.set('categoryId', filterCat);
      const tail = qs.toString() ? `?${qs.toString()}` : '';
      return cashlessApi<Product[]>(`/cashless/orgs/${organizationId}/events/${eventId}/products${tail}`);
    },
    enabled: !!organizationId && !!eventId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cashless-products', organizationId, eventId] });

  const saveMut = useMutation({
    mutationFn: () => {
      const isUpdate = !!drawer?.product;
      const body = {
        name: form.name,
        description: form.description || undefined,
        category: form.category,
        categoryId: form.categoryId || undefined,
        priceCents: Number(form.priceCents),
        stockQty: form.stockQty === '' ? undefined : Number(form.stockQty),
        lowStockThreshold: form.lowStockThreshold === '' ? undefined : Number(form.lowStockThreshold),
        isAvailable: form.isAvailable,
        sortOrder: Number(form.sortOrder),
      };
      return isUpdate
        ? cashlessApi(`/cashless/orgs/${organizationId}/products/${drawer!.product!.id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          })
        : cashlessApi(`/cashless/orgs/${organizationId}/pos/${drawer!.posId}/products`, {
            method: 'POST',
            body: JSON.stringify(body),
          });
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'Produto salvo' });
      setDrawer(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) =>
      cashlessApi(`/cashless/orgs/${organizationId}/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Produto arquivado' });
      invalidate();
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  const uploadMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData();
      fd.append('image', file);
      return cashlessApi(`/cashless/orgs/${organizationId}/products/${id}/image`, {
        method: 'POST',
        body: fd,
      });
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'Imagem enviada' });
      invalidate();
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  const cloneMut = useMutation({
    mutationFn: () => {
      const qs = cloneOverwrite ? '?overwrite=true' : '';
      return cashlessApi<{ created: number; skipped: number; overwritten: number }>(
        `/cashless/orgs/${organizationId}/pos/${cloneDialog!.targetPosId}/products/clone-from/${cloneSourcePos}${qs}`,
        { method: 'POST' },
      );
    },
    onSuccess: (r) => {
      addToast({ type: 'success', message: `Clone: ${r.created} criados, ${r.skipped} pulados, ${r.overwritten} sobrescritos` });
      setCloneDialog(null);
      setCloneSourcePos('');
      setCloneOverwrite(false);
      invalidate();
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  function openCreate(posId: string) {
    setDrawer({ posId });
    setForm(emptyForm);
  }
  function openEdit(p: Product) {
    setDrawer({ posId: p.posId, product: p });
    setForm({
      name: p.name,
      description: p.description ?? '',
      category: p.category,
      categoryId: p.categoryId ?? '',
      priceCents: p.priceCents,
      stockQty: p.stockQty == null ? '' : String(p.stockQty),
      lowStockThreshold: p.lowStockThreshold == null ? '' : String(p.lowStockThreshold),
      isAvailable: p.isAvailable,
      sortOrder: p.sortOrder,
    });
  }

  if (productsQ.isLoading) return <Spinner size="lg" />;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <h1>Produtos</h1>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'end' }}>
        <label>
          <div>POS</div>
          <select value={filterPos} onChange={(e) => setFilterPos(e.target.value)} style={{ padding: 8 }}>
            <option value="">Todos</option>
            {posList.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <div>Categoria</div>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ padding: 8 }}>
            <option value="">Todas</option>
            {catList.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {posList.data?.map((p) => (
            <Button key={p.id} onClick={() => openCreate(p.id)}>+ {p.name}</Button>
          ))}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
            <th style={{ padding: 8 }}>Foto</th>
            <th style={{ padding: 8 }}>Nome</th>
            <th style={{ padding: 8 }}>POS</th>
            <th style={{ padding: 8 }}>Cat.</th>
            <th style={{ padding: 8 }}>Preço</th>
            <th style={{ padding: 8 }}>Estoque</th>
            <th style={{ padding: 8 }}>Disponível</th>
            <th style={{ padding: 8 }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {productsQ.data?.map((p) => {
            const posName = posList.data?.find((x) => x.id === p.posId)?.name ?? '?';
            return (
              <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 8 }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                  ) : '—'}
                </td>
                <td style={{ padding: 8 }}>{p.name}</td>
                <td style={{ padding: 8 }}>{posName}</td>
                <td style={{ padding: 8 }}>{p.category}</td>
                <td style={{ padding: 8 }}>R$ {(p.priceCents / 100).toFixed(2)}</td>
                <td style={{ padding: 8 }}>{p.stockQty ?? '∞'}</td>
                <td style={{ padding: 8 }}>{p.isAvailable ? '✓' : '—'}</td>
                <td style={{ padding: 8, display: 'flex', gap: 6 }}>
                  <Button onClick={() => openEdit(p)}>Editar</Button>
                  <label style={{ cursor: 'pointer', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4 }}>
                    Foto
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadMut.mutate({ id: p.id, file: f });
                      }}
                    />
                  </label>
                  <Button
                    onClick={() => {
                      if (confirm(`Arquivar "${p.name}"?`)) archiveMut.mutate(p.id);
                    }}
                  >
                    Arquivar
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 24 }}>
        <h3>Clonar cardápio</h3>
        {posList.data?.map((p) => (
          <Button key={p.id} onClick={() => setCloneDialog({ targetPosId: p.id })} style={{ marginRight: 8 }}>
            Clonar pra {p.name}
          </Button>
        ))}
      </div>

      {drawer && (
        <dialog open style={{ position: 'fixed', top: '5%', maxHeight: '85vh', overflow: 'auto', padding: 24, border: '1px solid #ddd', borderRadius: 8, width: 480 }}>
          <h3>{drawer.product ? 'Editar produto' : 'Novo produto'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label><div>Nome</div><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label><div>Descrição</div><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label>
              <div>Categoria (enum)</div>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: 8 }}>
                {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              <div>Categoria livre (opcional)</div>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} style={{ width: '100%', padding: 8 }}>
                <option value="">— sem categoria —</option>
                {catList.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              <div>Preço (centavos)</div>
              <Input type="number" value={String(form.priceCents)} onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })} />
            </label>
            <label>
              <div>Estoque inicial (deixe vazio = sem rastreio)</div>
              <Input type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
            </label>
            <label>
              <div>Threshold de alerta</div>
              <Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
            </label>
            <label>
              <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} /> Disponível
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => saveMut.mutate()} disabled={!form.name || saveMut.isPending}>Salvar</Button>
              <Button onClick={() => setDrawer(null)}>Cancelar</Button>
            </div>
          </div>
        </dialog>
      )}

      {cloneDialog && (
        <dialog open style={{ position: 'fixed', top: '20%', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3>Clonar cardápio para {posList.data?.find((p) => p.id === cloneDialog.targetPosId)?.name}</h3>
          <label>
            <div>Origem</div>
            <select value={cloneSourcePos} onChange={(e) => setCloneSourcePos(e.target.value)} style={{ width: '100%', padding: 8 }}>
              <option value="">— escolha um POS —</option>
              {posList.data?.filter((p) => p.id !== cloneDialog.targetPosId).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            <input type="checkbox" checked={cloneOverwrite} onChange={(e) => setCloneOverwrite(e.target.checked)} /> Sobrescrever produtos com o mesmo nome
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button onClick={() => cloneMut.mutate()} disabled={!cloneSourcePos || cloneMut.isPending}>Clonar</Button>
            <Button onClick={() => setCloneDialog(null)}>Cancelar</Button>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default AdminProductsPage;
