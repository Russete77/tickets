import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useToastStore } from '@shared/stores/toastStore';
import { cashlessApi } from '../cashless/api';

type ZoneKind = 'general' | 'vip' | 'bar' | 'bathroom' | 'first_aid' | 'stage' | 'exit';
interface Zone {
  id: string;
  name: string;
  polygon: Array<[number, number]>;
  capacity?: number;
  color?: string;
  kind?: ZoneKind;
}
interface VenueMap {
  id: string;
  eventId: string;
  svgUrl: string | null;
  zones: Zone[];
}

const KIND_COLORS: Record<ZoneKind, string> = {
  general: '#3b82f6',
  vip: '#a855f7',
  bar: '#f59e0b',
  bathroom: '#94a3b8',
  first_aid: '#ef4444',
  stage: '#10b981',
  exit: '#64748b',
};

const AdminVenueMapPage: React.FC = () => {
  const { organizationId = '', eventId = '' } = useParams<{ organizationId: string; eventId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [editing, setEditing] = useState<Zone | null>(null);

  const mapQ = useQuery({
    queryKey: ['venue-map', eventId],
    queryFn: async () => {
      try {
        return await cashlessApi<VenueMap>(`/events/${eventId}/map`);
      } catch (e: unknown) {
        if (String((e as Error)?.message ?? '').startsWith('404')) {
          return { id: '', eventId, svgUrl: null, zones: [] } as VenueMap;
        }
        throw e;
      }
    },
    enabled: !!eventId,
  });

  const saveMut = useMutation({
    mutationFn: (payload: { svgUrl?: string | null; zones: Zone[] }) =>
      cashlessApi<VenueMap>(`/orgs/${organizationId}/events/${eventId}/venue-map`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Mapa salvo' });
      void qc.invalidateQueries({ queryKey: ['venue-map', eventId] });
    },
    onError: (e: Error) => addToast({ type: 'error', message: e.message }),
  });

  const zones = mapQ.data?.zones ?? [];
  const svgUrl = mapQ.data?.svgUrl ?? null;

  const handleAddZone = () => {
    const id = `z${zones.length + 1}-${Date.now().toString(36)}`;
    setEditing({
      id,
      name: 'Nova zona',
      polygon: [
        [10, 10],
        [50, 10],
        [50, 50],
        [10, 50],
      ],
      capacity: 100,
      kind: 'general',
    });
  };

  const handleSaveZone = (z: Zone) => {
    const next = [...zones.filter((x) => x.id !== z.id), z];
    saveMut.mutate({ svgUrl, zones: next });
    setEditing(null);
  };

  const handleRemoveZone = (id: string) => {
    if (!window.confirm('Remover esta zona?')) return;
    const next = zones.filter((z) => z.id !== id);
    saveMut.mutate({ svgUrl, zones: next });
  };

  const handleUpdateSvgUrl = (url: string) => {
    saveMut.mutate({ svgUrl: url || null, zones });
  };

  const previewBox = useMemo(() => {
    if (zones.length === 0) return { minX: 0, minY: 0, w: 200, h: 200 };
    const xs = zones.flatMap((z) => z.polygon.map(([x]) => x));
    const ys = zones.flatMap((z) => z.polygon.map(([, y]) => y));
    const minX = Math.min(0, ...xs);
    const minY = Math.min(0, ...ys);
    const maxX = Math.max(...xs, 200);
    const maxY = Math.max(...ys, 200);
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }, [zones]);

  if (mapQ.isLoading) return <Spinner size="lg" />;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <h1>Mapa do venue</h1>
      <p style={{ color: '#666' }}>
        Desenhe zonas (bares, banheiros, palcos, VIP) que aparecem no app dos participantes.
      </p>

      <section style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 14, color: '#555' }}>SVG do venue (URL R2/CDN):</label>
        <Input
          type="text"
          value={svgUrl ?? ''}
          onChange={(e) => handleUpdateSvgUrl(e.target.value)}
          placeholder="https://..."
          style={{ flex: 1 }}
        />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, marginTop: 24 }}>
        <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, minHeight: 480 }}>
          <svg viewBox={`${previewBox.minX} ${previewBox.minY} ${previewBox.w} ${previewBox.h}`} style={{ width: '100%', height: 480 }}>
            {svgUrl && <image href={svgUrl} x={previewBox.minX} y={previewBox.minY} width={previewBox.w} height={previewBox.h} />}
            {zones.map((z) => (
              <polygon
                key={z.id}
                points={z.polygon.map((p) => p.join(',')).join(' ')}
                fill={(z.color ?? (z.kind ? KIND_COLORS[z.kind] : '#3b82f6')) + '88'}
                stroke="#fff"
                strokeWidth={1}
                onClick={() => setEditing(z)}
                style={{ cursor: 'pointer' }}
              />
            ))}
            {zones.map((z) => {
              const cx = z.polygon.reduce((s, [x]) => s + x, 0) / z.polygon.length;
              const cy = z.polygon.reduce((s, [, y]) => s + y, 0) / z.polygon.length;
              return (
                <text key={`${z.id}-l`} x={cx} y={cy} fill="#fff" fontSize="10" textAnchor="middle">
                  {z.name}
                </text>
              );
            })}
          </svg>
        </div>

        <div>
          <Button variant="primary" onClick={handleAddZone}>+ Nova zona</Button>
          <ul style={{ marginTop: 16, listStyle: 'none', padding: 0 }}>
            {zones.map((z) => (
              <li key={z.id} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{z.name}</strong>
                  <span style={{ fontSize: 12, color: '#999' }}>{z.kind ?? 'general'}</span>
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>capacidade: {z.capacity ?? '—'}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <Button variant="secondary" size="sm" onClick={() => setEditing(z)}>Editar</Button>
                  <Button variant="secondary" size="sm" onClick={() => handleRemoveZone(z.id)}>Remover</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {editing && (
        <ZoneEditor
          initial={editing}
          onSave={handleSaveZone}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
};

const ZoneEditor: React.FC<{ initial: Zone; onSave: (z: Zone) => void; onCancel: () => void }> = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState<Zone>(initial);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 500, maxWidth: '90vw' }}>
        <h2>Editar zona</h2>
        <label style={{ display: 'block', marginTop: 12 }}>Nome</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label style={{ display: 'block', marginTop: 12 }}>Tipo</label>
        <select
          value={form.kind ?? 'general'}
          onChange={(e) => setForm({ ...form, kind: e.target.value as ZoneKind })}
          style={{ width: '100%', padding: 6 }}
        >
          {Object.keys(KIND_COLORS).map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <label style={{ display: 'block', marginTop: 12 }}>Capacidade</label>
        <Input
          type="number"
          value={String(form.capacity ?? 0)}
          onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
        />
        <label style={{ display: 'block', marginTop: 12 }}>Polígono (JSON [[x,y],...])</label>
        <textarea
          value={JSON.stringify(form.polygon)}
          onChange={(e) => {
            try {
              const next = JSON.parse(e.target.value) as Array<[number, number]>;
              setForm({ ...form, polygon: next });
            } catch {
              // ignore parse errors while typing
            }
          }}
          rows={4}
          style={{ width: '100%', padding: 6, fontFamily: 'monospace', fontSize: 12 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" onClick={() => onSave(form)}>Salvar</Button>
        </div>
      </div>
    </div>
  );
};

export default AdminVenueMapPage;
