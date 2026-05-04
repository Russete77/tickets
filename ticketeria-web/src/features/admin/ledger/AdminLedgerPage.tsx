/**
 * Tela: Ledger contábil — accounts + entries + close event.
 * Auditoria CTO 2026-05 — gap 4.5
 */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { useToastStore } from '@shared/stores/toastStore';
import { formatCurrency } from '@shared/i18n';

const API = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface LedgerAccount {
  id: string;
  organizationId: string;
  eventId: string | null;
  walletId: string | null;
  type: string;
  currency: string;
  balanceCents: string; // BigInt vem como string no JSON
  createdAt: string;
}

interface LedgerEntry {
  id: string;
  accountId: string;
  groupId: string;
  sourceType: string;
  sourceId: string;
  direction: 'debit' | 'credit';
  amountCents: string;
  balanceAfter: string;
  currency: string;
  description: string | null;
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

const AdminLedgerPage: React.FC = () => {
  const { organizationId = '' } = useParams<{ organizationId: string }>();
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [eventToClose, setEventToClose] = useState('');
  const [closeIssues, setCloseIssues] = useState<string[] | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['ledger-accounts', organizationId],
    queryFn: () =>
      api<LedgerAccount[]>(`/ledger/${organizationId}/accounts`),
    enabled: !!organizationId,
  });

  const { data: entries } = useQuery({
    queryKey: ['ledger-entries', organizationId, selectedAccount],
    queryFn: () =>
      api<LedgerEntry[]>(
        `/ledger/${organizationId}/accounts/${selectedAccount}/entries?limit=100`,
      ),
    enabled: !!selectedAccount,
  });

  const closeMut = useMutation({
    mutationFn: () =>
      api<{ eventId: string; issues: string[] }>(
        `/ledger/${organizationId}/events/${eventToClose}/close`,
        { method: 'POST' },
      ),
    onSuccess: (data) => {
      setCloseIssues(data.issues);
      if (data.issues.length === 0) {
        addToast({ type: 'success', message: 'Evento fechado — invariantes OK' });
      } else {
        addToast({ type: 'error', message: `${data.issues.length} divergência(s) detectada(s)` });
      }
      qc.invalidateQueries({ queryKey: ['ledger-accounts', organizationId] });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  });

  if (isLoading) return <Spinner size="lg" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, maxWidth: 1400, margin: '0 auto', padding: 24 }}>
      <aside>
        <h2>Contas</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 600, overflow: 'auto' }}>
          {accounts?.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAccount(a.id)}
              style={{
                textAlign: 'left',
                padding: 8,
                border: selectedAccount === a.id ? '2px solid #000' : '1px solid #ddd',
                borderRadius: 4,
                background: selectedAccount === a.id ? '#f0f0f0' : '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 11, color: '#888' }}>{a.type}</div>
              <div style={{ fontWeight: 600 }}>
                {formatCurrency(BigInt(a.balanceCents), a.currency)}
              </div>
              <div style={{ fontSize: 10, color: '#aaa' }}>
                {a.eventId ? `event:${a.eventId.slice(0, 8)}…` : 'org-wide'}
              </div>
            </button>
          ))}
          {accounts?.length === 0 && <p style={{ color: '#666' }}>Sem contas ainda.</p>}
        </div>

        <hr style={{ margin: '24px 0' }} />

        <h3>Fechar evento</h3>
        <p style={{ fontSize: 12, color: '#666' }}>
          Valida invariantes do ledger (debit == credit, sem saldo negativo).
        </p>
        <Input
          placeholder="event UUID"
          value={eventToClose}
          onChange={(e) => setEventToClose(e.target.value)}
        />
        <Button
          onClick={() => closeMut.mutate()}
          disabled={!eventToClose || closeMut.isPending}
          style={{ marginTop: 8 }}
        >
          {closeMut.isPending ? 'Validando...' : 'Validar fechamento'}
        </Button>

        {closeIssues && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              border: closeIssues.length === 0 ? '1px solid green' : '1px solid crimson',
              background: closeIssues.length === 0 ? '#f0fff0' : '#fff0f0',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            {closeIssues.length === 0 ? (
              <strong>✓ Invariantes OK</strong>
            ) : (
              <>
                <strong>{closeIssues.length} divergência(s):</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
                  {closeIssues.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </aside>

      <main>
        <h1>Ledger</h1>
        {!selectedAccount && <p style={{ color: '#666' }}>Selecione uma conta à esquerda.</p>}
        {selectedAccount && (
          <>
            <h2>Movimentações</h2>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <th align="left">Quando</th>
                  <th align="left">Tipo</th>
                  <th align="left">Origem</th>
                  <th align="right">Debit</th>
                  <th align="right">Credit</th>
                  <th align="right">Saldo</th>
                  <th align="left">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {entries?.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td>{new Date(e.createdAt).toLocaleString()}</td>
                    <td>
                      <code>{e.sourceType}</code>
                    </td>
                    <td style={{ fontSize: 10, color: '#888' }}>
                      <code>{e.sourceId.slice(0, 12)}…</code>
                    </td>
                    <td align="right" style={{ color: 'crimson' }}>
                      {e.direction === 'debit'
                        ? formatCurrency(BigInt(e.amountCents), e.currency)
                        : '—'}
                    </td>
                    <td align="right" style={{ color: 'green' }}>
                      {e.direction === 'credit'
                        ? formatCurrency(BigInt(e.amountCents), e.currency)
                        : '—'}
                    </td>
                    <td align="right">
                      <strong>{formatCurrency(BigInt(e.balanceAfter), e.currency)}</strong>
                    </td>
                    <td>{e.description ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminLedgerPage;
