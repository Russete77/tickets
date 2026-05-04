/**
 * Tela: Branding (white-label).
 * Auditoria CTO 2026-05 — gap 4.12
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useToastStore } from '@shared/stores/toastStore';

const API = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface Branding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  metaDescription?: string;
  socialImage?: string;
}

interface OrgWithBranding {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  branding?: Branding;
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

const AdminBrandingPage: React.FC = () => {
  const { organizationId = '' } = useParams<{ organizationId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [form, setForm] = useState<Branding & { domain?: string }>({});

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => api<OrgWithBranding>(`/organizations/${organizationId}`),
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (org) setForm({ ...(org.branding ?? {}), domain: org.domain });
  }, [org]);

  const saveMut = useMutation({
    mutationFn: () =>
      api(`/branding/${organizationId}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Branding salvo' });
      qc.invalidateQueries({ queryKey: ['organization', organizationId] });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  });

  if (isLoading) return <Spinner size="lg" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div>
        <h1>White-label / Branding</h1>
        <p style={{ color: '#666' }}>Personalize a aparência da sua plataforma.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          <label>
            <div>Domínio customizado</div>
            <Input
              value={form.domain ?? ''}
              onChange={(e) => setForm({ ...form, domain: e.target.value.trim().toLowerCase() })}
              placeholder="festas.suaempresa.com.br"
            />
          </label>

          <label>
            <div>URL do logo</div>
            <Input
              value={form.logoUrl ?? ''}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://..."
            />
          </label>

          <label>
            <div>URL do favicon</div>
            <Input
              value={form.faviconUrl ?? ''}
              onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })}
              placeholder="https://..."
            />
          </label>

          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ flex: 1 }}>
              <div>Cor primária</div>
              <input
                type="color"
                value={form.primaryColor ?? '#000000'}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                style={{ width: '100%', height: 40 }}
              />
            </label>
            <label style={{ flex: 1 }}>
              <div>Cor de destaque</div>
              <input
                type="color"
                value={form.accentColor ?? '#FF3366'}
                onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                style={{ width: '100%', height: 40 }}
              />
            </label>
          </div>

          <label>
            <div>Fonte (CSS font-family)</div>
            <Input
              value={form.fontFamily ?? ''}
              onChange={(e) => setForm({ ...form, fontFamily: e.target.value })}
              placeholder="Inter, system-ui, sans-serif"
            />
          </label>

          <label>
            <div>Meta description (SEO)</div>
            <Input
              value={form.metaDescription ?? ''}
              onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
              maxLength={280}
            />
          </label>

          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <aside style={{ position: 'sticky', top: 24, height: 'fit-content' }}>
        <h2>Preview</h2>
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 24,
            background: '#fafafa',
            fontFamily: form.fontFamily ?? 'inherit',
          }}
        >
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="logo" style={{ height: 40, marginBottom: 16 }} />
          ) : (
            <div
              style={{
                height: 40,
                marginBottom: 16,
                background: form.primaryColor ?? '#000',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                borderRadius: 4,
              }}
            >
              {org?.name ?? 'PulsePass'}
            </div>
          )}
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: '#fff',
              borderLeft: `4px solid ${form.accentColor ?? '#FF3366'}`,
            }}
          >
            <h3 style={{ margin: 0, color: form.primaryColor ?? '#000' }}>
              Festival Exemplo
            </h3>
            <p style={{ margin: '8px 0', color: '#666' }}>
              {form.metaDescription ?? 'O melhor festival da sua cidade.'}
            </p>
            <button
              style={{
                background: form.accentColor ?? '#FF3366',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Comprar ingresso
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AdminBrandingPage;
