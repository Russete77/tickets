import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import shared from './admin.shared.module.css';
import styles from './AdminAreas.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface AdminEvent {
  id: string;
  title: string;
  startDate: string;
}

interface Area {
  id: string;
  eventId: string;
  name: string;
  capacity: number;
  occupancy: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function occupancyColor(pct: number): string {
  if (pct > 90) return styles.barRed;
  if (pct > 70) return styles.barYellow;
  return styles.barBlue;
}

// ── Modal ─────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <button className={styles.modalClose} onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className={styles.modalBody}>{children}</div>
    </div>
  </div>
);

// ── Area Form ─────────────────────────────────────────────────────────────

interface AreaFormProps {
  eventId: string;
  area?: Area;
  onClose: () => void;
}

const AreaForm: React.FC<AreaFormProps> = ({ eventId, area, onClose }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: area?.name ?? '',
    capacity: area ? String(area.capacity) : '500',
  });

  const mutation = useMutation({
    mutationFn: () =>
      area
        ? api.put(`/v1/areas/${area.id}`, { ...form, capacity: parseInt(form.capacity, 10) })
        : api.post('/v1/areas', { ...form, eventId, capacity: parseInt(form.capacity, 10) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['areas', eventId] });
      onClose();
    },
  });

  return (
    <div className={styles.formStack}>
      <div className={styles.formField}>
        <label className={styles.label}>Nome da área</label>
        <input
          className={styles.input}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="ex: Pista Principal"
        />
      </div>
      <div className={styles.formField}>
        <label className={styles.label}>Capacidade máxima</label>
        <input
          className={styles.input}
          type="number"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          min="1"
        />
      </div>
      <div className={styles.formActions}>
        <button className={shared.btnSecondary} onClick={onClose}>Cancelar</button>
        <button
          className={shared.btnPrimary}
          onClick={() => mutation.mutate()}
          disabled={!form.name.trim() || mutation.isPending}
        >
          {mutation.isPending ? 'Salvando...' : area ? 'Salvar' : 'Criar Área'}
        </button>
      </div>
    </div>
  );
};

// ── Area Card ─────────────────────────────────────────────────────────────

interface AreaCardProps {
  area: Area;
  onEdit: () => void;
  onDelete: () => void;
}

const AreaCard: React.FC<AreaCardProps> = ({ area, onEdit, onDelete }) => {
  const pct = area.capacity > 0 ? Math.round((area.occupancy / area.capacity) * 100) : 0;
  const barCls = occupancyColor(pct);

  return (
    <div className={styles.areaCard}>
      <div className={styles.areaCardHeader}>
        <h3 className={styles.areaName}>{area.name}</h3>
        <div className={shared.actions}>
          <button className={shared.actionBtn} title="Editar" onClick={onEdit}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className={`${shared.actionBtn} ${shared.actionBtnDanger}`} title="Remover" onClick={onDelete}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.areaStats}>
        <span className={styles.occupancyLabel}>
          {area.occupancy} / {area.capacity} pessoas
        </span>
        <span className={`${styles.pctBadge} ${pct > 90 ? styles.pctRed : pct > 70 ? styles.pctYellow : styles.pctBlue}`}>
          {pct}%
        </span>
      </div>

      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${barCls}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <p className={styles.capacityInfo}>Capacidade total: {area.capacity}</p>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

const AdminAreas: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editArea, setEditArea] = useState<Area | null>(null);
  const qc = useQueryClient();

  const { data: events = [] } = useQuery<AdminEvent[]>({
    queryKey: ['admin-events-dropdown'],
    queryFn: async () => {
      const r = await api.get<{ events: AdminEvent[]; total: number }>('/v1/admin/events?limit=100');
      return r.data?.events ?? [];
    },
  });

  const { data: areas = [], isLoading } = useQuery<Area[]>({
    queryKey: ['areas', selectedEventId],
    queryFn: async () => {
      const r = await api.get<Area[]>(`/v1/areas?eventId=${selectedEventId}`);
      return r.data ?? [];
    },
    enabled: !!selectedEventId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/areas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas', selectedEventId] }),
  });

  return (
    <AdminLayout>
      <div className={shared.page}>
        {showCreate && selectedEventId && (
          <Modal title="Nova Área" onClose={() => setShowCreate(false)}>
            <AreaForm eventId={selectedEventId} onClose={() => setShowCreate(false)} />
          </Modal>
        )}
        {editArea && (
          <Modal title="Editar Área" onClose={() => setEditArea(null)}>
            <AreaForm eventId={selectedEventId} area={editArea} onClose={() => setEditArea(null)} />
          </Modal>
        )}

        {/* Header */}
        <div className={shared.pageHeader}>
          <div>
            <h1 className={shared.pageTitle}>Áreas do Evento</h1>
            <p className={shared.pageSubtitle}>Gerencie zonas e ocupação por evento</p>
          </div>
        </div>

        {/* Event Selector */}
        <div className={shared.card}>
          <div className={shared.cardHeader}>
            <h2 className={shared.cardTitle}>Selecionar Evento</h2>
          </div>
          <div className={shared.cardBody}>
            <select
              className={styles.eventSelect}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">— Selecione um evento —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Areas Grid */}
        {selectedEventId && (
          <div className={shared.card}>
            <div className={shared.cardHeader}>
              <h2 className={shared.cardTitle}>Áreas ({areas.length})</h2>
              <button className={shared.btnPrimary} onClick={() => setShowCreate(true)}>
                + Adicionar Área
              </button>
            </div>
            <div className={shared.cardBody}>
              {isLoading ? (
                <div className={styles.loading}>Carregando áreas...</div>
              ) : areas.length === 0 ? (
                <div className={styles.empty}>Nenhuma área cadastrada para este evento</div>
              ) : (
                <div className={styles.areasGrid}>
                  {areas.map((area) => (
                    <AreaCard
                      key={area.id}
                      area={area}
                      onEdit={() => setEditArea(area)}
                      onDelete={() => deleteMutation.mutate(area.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAreas;
