import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useToastStore } from '@shared/stores/toastStore';
import { cashlessApi } from './api';

interface Pos { id: string; name: string }
interface Operator {
  id: string;
  posId: string;
  name?: string;
  cpf?: string;
  userId?: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
}

const empty = { name: '', cpf: '', pin: '', isActive: true };

const AdminOperatorsPage: React.FC = () => {
  const { organizationId = '', eventId = '' } = useParams<{ organizationId: string; eventId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [posId, setPosId] = useState<string>('');
  const [form, setForm] = useState(empty);
  const [resetting, setResetting] = useState<{ id: string; pin: string } | null>(null);

  const posList = useQuery({
    queryKey: ['cashless-pos', organizationId, eventId],
    queryFn: () => cashlessApi<Pos[]>(`/cashless/orgs/${organizationId}/events/${eventId}/pos`),
    enabled: !!organizationId && !!eventId,
  });

  React.useEffect(() => {
    if (!posId && posList.data?.[0]) setPosId(posList.data[0].id);
  }, [posList.data, posId]);

  const opsList = useQuery({
    queryKey: ['cashless-operators', organizationId, posId],
    queryFn: () => cashlessApi<Operator[]>(`/cashless/orgs/${organizationId}/pos/${posId}/operators`),
    enabled: !!posId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      cashlessApi(`/cashless/orgs/${organizationId}/pos/${posId}/operators`, {
        method: 'POST',
        body: JSON.stringify({
          name: form.name || undefined,
          cpf: form.cpf || undefined,
          pin: form.pin,
          isActive: form.isActive,
        }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Operador criado' });
      setForm(empty);
      qc.invalidateQueries({ queryKey: ['cashless-operators', organizationId, posId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  const resetPinMut = useMutation({
    mutationFn: (args: { id: string; pin: string }) =>
      cashlessApi(`/cashless/orgs/${organizationId}/operators/${args.id}/reset-pin`, {
        method: 'PATCH',
        body: JSON.stringify({ newPin: args.pin }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'PIN redefinido' });
      setResetting(null);
      qc.invalidateQueries({ queryKey: ['cashless-operators', organizationId, posId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) =>
      cashlessApi(`/cashless/orgs/${organizationId}/operators/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Operador arquivado' });
      qc.invalidateQueries({ queryKey: ['cashless-operators', organizationId, posId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <h1>Operadores</h1>

      <label style={{ marginTop: 16, display: 'block' }}>
        <div>POS</div>
        <select value={posId} onChange={(e) => setPosId(e.target.value)} style={{ padding: 8 }}>
          {posList.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      {posId && (
        <>
          <section style={{ marginTop: 24, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
            <h3>Novo operador</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <label><div>Nome</div><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label><div>CPF (opcional)</div><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></label>
              <label><div>PIN (4-6 dígitos)</div><Input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })} /></label>
              <Button
                onClick={() => createMut.mutate()}
                disabled={!form.name || !/^\d{4,6}$/.test(form.pin) || createMut.isPending}
              >
                Criar
              </Button>
            </div>
          </section>

          <section style={{ marginTop: 24 }}>
            <h3>Operadores ({opsList.data?.length ?? 0})</h3>
            {opsList.isLoading && <Spinner size="md" />}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                  <th style={{ padding: 8 }}>Nome</th>
                  <th style={{ padding: 8 }}>CPF</th>
                  <th style={{ padding: 8 }}>Ativo</th>
                  <th style={{ padding: 8 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {opsList.data?.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: 8 }}>{o.name ?? <em>(via User #{o.userId?.slice(0, 8)})</em>}</td>
                    <td style={{ padding: 8 }}>{o.cpf ?? '—'}</td>
                    <td style={{ padding: 8 }}>{o.isActive ? '✓' : '—'}</td>
                    <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                      <Button onClick={() => setResetting({ id: o.id, pin: '' })}>Reset PIN</Button>
                      <Button onClick={() => { if (confirm('Arquivar?')) archiveMut.mutate(o.id); }}>Arquivar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {resetting && (
        <dialog open style={{ position: 'fixed', top: '25%', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3>Redefinir PIN</h3>
          <Input
            value={resetting.pin}
            onChange={(e) => setResetting({ ...resetting, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            placeholder="Novo PIN (4-6 dígitos)"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button
              onClick={() => resetPinMut.mutate({ id: resetting.id, pin: resetting.pin })}
              disabled={!/^\d{4,6}$/.test(resetting.pin)}
            >
              Redefinir
            </Button>
            <Button onClick={() => setResetting(null)}>Cancelar</Button>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default AdminOperatorsPage;
