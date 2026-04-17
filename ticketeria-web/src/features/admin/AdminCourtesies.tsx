import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import shared from './admin.shared.module.css';
import styles from './AdminCourtesies.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface AdminEvent {
  id: string;
  title: string;
  startDate: string;
}

type CourtesyStatus = 'pending' | 'approved' | 'used';
type BatchType = 'vip' | 'camarote' | 'backstage' | 'press' | 'artista';

interface Courtesy {
  id: string;
  eventId: string;
  guestName: string;
  email: string;
  batchType: BatchType;
  notes: string;
  status: CourtesyStatus;
  createdAt: string;
}

interface CourtesyStats {
  total: number;
  used: number;
  remaining: number;
  usagePct: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const batchLabel: Record<BatchType, { label: string; cls: string }> = {
  vip:       { label: 'VIP',       cls: shared.badgePurple },
  camarote:  { label: 'Camarote',  cls: shared.badgeBlue   },
  backstage: { label: 'Backstage', cls: shared.badgeYellow },
  press:     { label: 'Imprensa',  cls: shared.badgeGray   },
  artista:   { label: 'Artista',   cls: shared.badgeGreen  },
};

const statusLabel: Record<CourtesyStatus, { label: string; cls: string }> = {
  pending:  { label: 'Pendente',  cls: shared.badgeYellow },
  approved: { label: 'Aprovada',  cls: shared.badgeGreen  },
  used:     { label: 'Utilizada', cls: shared.badgeGray   },
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { dateStyle: 'short' });

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

// ── Create Courtesy Form ───────────────────────────────────────────────────

interface CreateCourtesyFormProps {
  eventId: string;
  onClose: () => void;
}

const CreateCourtesyForm: React.FC<CreateCourtesyFormProps> = ({ eventId, onClose }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    guestName: '',
    email: '',
    batchType: 'vip' as BatchType,
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/v1/courtesies', { ...form, eventId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courtesies', eventId] });
      onClose();
    },
  });

  return (
    <div className={styles.formStack}>
      <div className={styles.formField}>
        <label className={styles.label}>Nome do convidado</label>
        <input
          className={styles.input}
          value={form.guestName}
          onChange={(e) => setForm({ ...form, guestName: e.target.value })}
          placeholder="ex: Maria Silva"
        />
      </div>
      <div className={styles.formField}>
        <label className={styles.label}>E-mail</label>
        <input
          className={styles.input}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="maria@email.com"
        />
      </div>
      <div className={styles.formField}>
        <label className={styles.label}>Tipo de ingresso</label>
        <select
          className={styles.select}
          value={form.batchType}
          onChange={(e) => setForm({ ...form, batchType: e.target.value as BatchType })}
        >
          <option value="vip">VIP</option>
          <option value="camarote">Camarote</option>
          <option value="backstage">Backstage</option>
          <option value="press">Imprensa</option>
          <option value="artista">Artista</option>
        </select>
      </div>
      <div className={styles.formField}>
        <label className={styles.label}>Observações</label>
        <textarea
          className={styles.textarea}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notas internas sobre esta cortesia..."
          rows={3}
        />
      </div>
      <div className={styles.formActions}>
        <button className={shared.btnSecondary} onClick={onClose}>Cancelar</button>
        <button
          className={shared.btnPrimary}
          onClick={() => mutation.mutate()}
          disabled={!form.guestName.trim() || !form.email.trim() || mutation.isPending}
        >
          {mutation.isPending ? 'Criando...' : 'Criar Cortesia'}
        </button>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

const AdminCourtesies: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: events = [] } = useQuery<AdminEvent[]>({
    queryKey: ['admin-events-dropdown'],
    queryFn: async () => {
      const r = await api.get<{ events: AdminEvent[]; total: number }>('/v1/admin/events?limit=100');
      return r.data?.events ?? [];
    },
  });

  const { data: courtesies = [], isLoading } = useQuery<Courtesy[]>({
    queryKey: ['courtesies', selectedEventId],
    queryFn: async () => {
      const r = await api.get<Courtesy[]>(`/v1/courtesies?eventId=${selectedEventId}`);
      return r.data ?? [];
    },
    enabled: !!selectedEventId,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/v1/courtesies/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courtesies', selectedEventId] }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/v1/courtesies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courtesies', selectedEventId] }),
  });

  const stats: CourtesyStats = {
    total: courtesies.length,
    used: courtesies.filter((c) => c.status === 'used').length,
    remaining: courtesies.filter((c) => c.status !== 'used').length,
    usagePct: courtesies.length > 0
      ? Math.round((courtesies.filter((c) => c.status === 'used').length / courtesies.length) * 100)
      : 0,
  };

  const filtered = courtesies.filter(
    (c) =>
      c.guestName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdminLayout>
      <div className={shared.page}>
        {showCreate && selectedEventId && (
          <Modal title="Criar Cortesia" onClose={() => setShowCreate(false)}>
            <CreateCourtesyForm eventId={selectedEventId} onClose={() => setShowCreate(false)} />
          </Modal>
        )}

        {/* Header */}
        <div className={shared.pageHeader}>
          <div>
            <h1 className={shared.pageTitle}>Cortesias</h1>
            <p className={shared.pageSubtitle}>Gerencie ingressos VIP e cortesias por evento</p>
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

        {selectedEventId && (
          <>
            {/* KPIs */}
            <div className={shared.kpiGrid}>
              <div className={`${shared.kpiCard} ${shared.kpiColor_blue}`}>
                <div className={shared.kpiIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                    <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div className={shared.kpiBody}>
                  <p className={shared.kpiTitle}>Total de Cortesias</p>
                  <p className={shared.kpiValue}>{stats.total}</p>
                </div>
              </div>
              <div className={`${shared.kpiCard} ${shared.kpiColor_green}`}>
                <div className={shared.kpiIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                </div>
                <div className={shared.kpiBody}>
                  <p className={shared.kpiTitle}>Utilizadas</p>
                  <p className={shared.kpiValue}>{stats.used}</p>
                </div>
              </div>
              <div className={`${shared.kpiCard} ${shared.kpiColor_orange}`}>
                <div className={shared.kpiIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className={shared.kpiBody}>
                  <p className={shared.kpiTitle}>Disponíveis</p>
                  <p className={shared.kpiValue}>{stats.remaining}</p>
                </div>
              </div>
              <div className={`${shared.kpiCard} ${shared.kpiColor_purple}`}>
                <div className={shared.kpiIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <div className={shared.kpiBody}>
                  <p className={shared.kpiTitle}>Taxa de Uso</p>
                  <p className={shared.kpiValue}>{stats.usagePct}%</p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className={shared.card}>
              <div className={shared.cardHeader}>
                <h2 className={shared.cardTitle}>Cortesias do Evento</h2>
                <div className={shared.toolbar}>
                  <div className={shared.searchWrapper}>
                    <svg className={shared.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      className={shared.searchInput}
                      placeholder="Buscar por nome ou e-mail..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button className={shared.btnPrimary} onClick={() => setShowCreate(true)}>
                    + Criar Cortesia
                  </button>
                </div>
              </div>

              <div className={shared.tableWrapper}>
                {isLoading ? (
                  <div className={styles.loading}>Carregando cortesias...</div>
                ) : (
                  <table className={shared.table}>
                    <thead>
                      <tr>
                        <th>Convidado</th>
                        <th>E-mail</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th>Data</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => {
                        const b = batchLabel[c.batchType];
                        const s = statusLabel[c.status];
                        return (
                          <tr key={c.id}>
                            <td className={shared.tdBold}>{c.guestName}</td>
                            <td className={shared.tdMuted}>{c.email}</td>
                            <td><span className={`${shared.badge} ${b.cls}`}>{b.label}</span></td>
                            <td><span className={`${shared.badge} ${s.cls}`}>{s.label}</span></td>
                            <td className={shared.tdMuted}>{fmt(c.createdAt)}</td>
                            <td>
                              <div className={shared.actions}>
                                {c.status === 'pending' && (
                                  <button
                                    className={shared.actionBtn}
                                    title="Aprovar"
                                    onClick={() => approveMutation.mutate(c.id)}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  className={`${shared.actionBtn} ${shared.actionBtnDanger}`}
                                  title="Revogar"
                                  onClick={() => revokeMutation.mutate(c.id)}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr className={shared.emptyRow}>
                          <td colSpan={6}>Nenhuma cortesia encontrada</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCourtesies;
