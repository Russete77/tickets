/**
 * Tela: Organization (membros + roles).
 * Auditoria CTO 2026-05 — gap 4.1
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useToastStore } from '@shared/stores/toastStore';
import { useTranslation } from '@shared/i18n';

const API = import.meta.env.VITE_API_BASE_URL ?? '/api';

type Role = 'owner' | 'admin' | 'finance' | 'operator' | 'promoter' | 'viewer';

interface Member {
  organizationId: string;
  userId: string;
  role: Role;
  acceptedAt: string | null;
  createdAt: string;
}

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  type: string;
  members: Member[];
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

const AdminOrganizationPage: React.FC = () => {
  const { organizationId = '' } = useParams<{ organizationId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('operator');

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => api<OrgDetail>(`/organizations/${organizationId}`),
    enabled: !!organizationId,
  });

  const inviteMut = useMutation({
    mutationFn: () =>
      api<Member>(`/organizations/${organizationId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Membro convidado' });
      setInviteEmail('');
      qc.invalidateQueries({ queryKey: ['organization', organizationId] });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  });

  const updateRoleMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      api(`/organizations/${organizationId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Role atualizado' });
      qc.invalidateQueries({ queryKey: ['organization', organizationId] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) =>
      api(`/organizations/${organizationId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Membro removido' });
      qc.invalidateQueries({ queryKey: ['organization', organizationId] });
    },
  });

  if (isLoading) return <Spinner size="lg" />;
  if (!org) return <div>{t('errors.notFound')}</div>;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: 24 }}>
      <h1>{org.name}</h1>
      <p style={{ color: '#666' }}>
        slug: <code>{org.slug}</code> · type: {org.type}
      </p>

      <section style={{ marginTop: 32 }}>
        <h2>{t('admin.organization.invite')}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <Input
            placeholder={t('auth.email')}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            type="email"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as Role)}
            style={{ padding: 8 }}
          >
            <option value="admin">admin</option>
            <option value="finance">finance</option>
            <option value="operator">operator</option>
            <option value="promoter">promoter</option>
            <option value="viewer">viewer</option>
          </select>
          <Button
            onClick={() => inviteMut.mutate()}
            disabled={!inviteEmail || inviteMut.isPending}
          >
            {t('common.confirm')}
          </Button>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>{t('admin.team')}</h2>
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <th align="left">User ID</th>
              <th align="left">Role</th>
              <th align="left">Status</th>
              <th align="left">Desde</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {org.members.map((m) => (
              <tr key={m.userId} style={{ borderBottom: '1px solid #eee' }}>
                <td><code>{m.userId.slice(0, 8)}…</code></td>
                <td>
                  <select
                    value={m.role}
                    onChange={(e) =>
                      updateRoleMut.mutate({
                        userId: m.userId,
                        role: e.target.value as Role,
                      })
                    }
                  >
                    <option value="owner">owner</option>
                    <option value="admin">admin</option>
                    <option value="finance">finance</option>
                    <option value="operator">operator</option>
                    <option value="promoter">promoter</option>
                    <option value="viewer">viewer</option>
                  </select>
                </td>
                <td>{m.acceptedAt ? '✓ ativo' : 'pendente'}</td>
                <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => removeMut.mutate(m.userId)}
                    style={{ color: 'crimson', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default AdminOrganizationPage;
