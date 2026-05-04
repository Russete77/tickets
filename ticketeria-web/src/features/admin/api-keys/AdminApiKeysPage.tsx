/**
 * Tela: API Keys.
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

const ALL_SCOPES = [
  'events:read',
  'events:write',
  'orders:read',
  'tickets:read',
  'checkin:write',
  'cashless:read',
  'reports:read',
  'webhooks:write',
] as const;

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
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

const AdminApiKeysPage: React.FC = () => {
  const { organizationId = '' } = useParams<{ organizationId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['events:read', 'orders:read']);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys', organizationId],
    queryFn: () => api<ApiKey[]>(`/organizations/${organizationId}/api-keys`),
    enabled: !!organizationId,
  });

  const createMut = useMutation({
    mutationFn: () =>
      api<{ id: string; prefix: string; secretToken: string }>(
        `/organizations/${organizationId}/api-keys`,
        {
          method: 'POST',
          body: JSON.stringify({ name, scopes }),
        },
      ),
    onSuccess: (data) => {
      setCreatedSecret(data.secretToken);
      setName('');
      qc.invalidateQueries({ queryKey: ['api-keys', organizationId] });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  });

  const revokeMut = useMutation({
    mutationFn: (keyId: string) =>
      api(`/organizations/${organizationId}/api-keys/${keyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'API key revogada' });
      qc.invalidateQueries({ queryKey: ['api-keys', organizationId] });
    },
  });

  if (isLoading) return <Spinner size="lg" />;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: 24 }}>
      <h1>API Keys</h1>
      <p style={{ color: '#666' }}>Tokens para integradores. O secret é mostrado apenas uma vez.</p>

      {createdSecret && (
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            padding: 16,
            borderRadius: 8,
            marginTop: 16,
          }}
        >
          <strong>Copie agora! Não conseguirá ver de novo:</strong>
          <pre
            style={{
              background: '#fff',
              padding: 12,
              marginTop: 8,
              borderRadius: 4,
              fontSize: 12,
              overflowX: 'auto',
            }}
          >
            {createdSecret}
          </pre>
          <Button onClick={() => setCreatedSecret(null)}>Já copiei</Button>
        </div>
      )}

      <section style={{ marginTop: 32, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Criar nova key</h2>
        <Input
          placeholder="Nome (ex: Webhook integration)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div style={{ marginTop: 12 }}>
          <strong>Escopos:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {ALL_SCOPES.map((s) => (
              <label key={s} style={{ fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={scopes.includes(s)}
                  onChange={(e) => {
                    setScopes(e.target.checked ? [...scopes, s] : scopes.filter((x) => x !== s));
                  }}
                />
                <code style={{ marginLeft: 4 }}>{s}</code>
              </label>
            ))}
          </div>
        </div>
        <Button
          onClick={() => createMut.mutate()}
          disabled={!name || scopes.length === 0 || createMut.isPending}
          style={{ marginTop: 16 }}
        >
          {createMut.isPending ? 'Criando...' : 'Criar'}
        </Button>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Keys ativas</h2>
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <th align="left">Nome</th>
              <th align="left">Prefix</th>
              <th align="left">Escopos</th>
              <th align="left">Último uso</th>
              <th align="left">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys?.map((k) => (
              <tr key={k.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{k.name}</td>
                <td>
                  <code>{k.prefix}.****</code>
                </td>
                <td style={{ fontSize: 11 }}>{k.scopes.join(', ')}</td>
                <td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : '—'}</td>
                <td>{k.revokedAt ? 'revogada' : 'ativa'}</td>
                <td>
                  {!k.revokedAt && (
                    <button
                      onClick={() => {
                        if (confirm('Revogar esta key? Não poderá ser desfeito.')) {
                          revokeMut.mutate(k.id);
                        }
                      }}
                      style={{
                        color: 'crimson',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Revogar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default AdminApiKeysPage;
