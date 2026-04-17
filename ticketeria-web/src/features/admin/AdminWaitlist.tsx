import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import shared from './admin.shared.module.css';
import styles from './AdminWaitlist.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface AdminEvent {
  id: string;
  title: string;
  startDate: string;
}

type WaitlistStatus = 'waiting' | 'notified' | 'purchased';

interface WaitlistEntry {
  id: string;
  eventId: string;
  position: number;
  name: string;
  email: string;
  phone: string;
  batchPreference: string;
  status: WaitlistStatus;
  joinedAt: string;
}

interface WaitlistStats {
  total: number;
  notified: number;
  converted: number;
  conversionPct: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const statusLabel: Record<WaitlistStatus, { label: string; cls: string }> = {
  waiting:   { label: 'Aguardando', cls: shared.badgeYellow },
  notified:  { label: 'Notificado', cls: shared.badgeBlue   },
  purchased: { label: 'Comprou',    cls: shared.badgeGreen  },
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { dateStyle: 'short' });

// ── Page ──────────────────────────────────────────────────────────────────

const AdminWaitlist: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [search, setSearch] = useState('');
  const [batchCount, setBatchCount] = useState('10');
  const qc = useQueryClient();

  const { data: events = [] } = useQuery<AdminEvent[]>({
    queryKey: ['admin-events-dropdown'],
    queryFn: async () => {
      const r = await api.get<{ events: AdminEvent[]; total: number }>('/v1/admin/events?limit=100');
      return r.data?.events ?? [];
    },
  });

  const { data: entries = [], isLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ['waitlist', selectedEventId],
    queryFn: async () => {
      const r = await api.get<WaitlistEntry[]>(`/v1/waitlist?eventId=${selectedEventId}`);
      return r.data ?? [];
    },
    enabled: !!selectedEventId,
  });

  const notifyMutation = useMutation({
    mutationFn: () =>
      api.post(`/v1/waitlist/notify`, {
        eventId: selectedEventId,
        count: parseInt(batchCount, 10),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['waitlist', selectedEventId] }),
  });

  const stats: WaitlistStats = {
    total: entries.length,
    notified: entries.filter((e) => e.status === 'notified').length,
    converted: entries.filter((e) => e.status === 'purchased').length,
    conversionPct: entries.length > 0
      ? Math.round((entries.filter((e) => e.status === 'purchased').length / entries.length) * 100)
      : 0,
  };

  const filtered = entries.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search),
  );

  return (
    <AdminLayout>
      <div className={shared.page}>
        {/* Header */}
        <div className={shared.pageHeader}>
          <div>
            <h1 className={shared.pageTitle}>Lista de Espera</h1>
            <p className={shared.pageSubtitle}>Gerencie a fila de espera por evento</p>
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
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </div>
                <div className={shared.kpiBody}>
                  <p className={shared.kpiTitle}>Total na Fila</p>
                  <p className={shared.kpiValue}>{stats.total}</p>
                </div>
              </div>
              <div className={`${shared.kpiCard} ${shared.kpiColor_orange}`}>
                <div className={shared.kpiIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                    <path d="M22 17H2a3 3 0 000 6h20a3 3 0 000-6z" />
                    <path d="M5 17V11a7 7 0 0114 0v6" />
                  </svg>
                </div>
                <div className={shared.kpiBody}>
                  <p className={shared.kpiTitle}>Notificados</p>
                  <p className={shared.kpiValue}>{stats.notified}</p>
                </div>
              </div>
              <div className={`${shared.kpiCard} ${shared.kpiColor_green}`}>
                <div className={shared.kpiIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                    <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div className={shared.kpiBody}>
                  <p className={shared.kpiTitle}>Convertidos</p>
                  <p className={shared.kpiValue}>{stats.converted}</p>
                </div>
              </div>
              <div className={`${shared.kpiCard} ${shared.kpiColor_purple}`}>
                <div className={shared.kpiIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <div className={shared.kpiBody}>
                  <p className={shared.kpiTitle}>Conversão</p>
                  <p className={shared.kpiValue}>{stats.conversionPct}%</p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className={shared.card}>
              <div className={shared.cardHeader}>
                <h2 className={shared.cardTitle}>Fila de Espera</h2>
                <div className={shared.toolbar}>
                  <div className={shared.searchWrapper}>
                    <svg className={shared.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      className={shared.searchInput}
                      placeholder="Buscar por nome, e-mail ou telefone..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className={styles.notifyRow}>
                    <input
                      className={styles.batchInput}
                      type="number"
                      min="1"
                      value={batchCount}
                      onChange={(e) => setBatchCount(e.target.value)}
                      title="Quantas pessoas notificar"
                    />
                    <button
                      className={shared.btnPrimary}
                      onClick={() => notifyMutation.mutate()}
                      disabled={notifyMutation.isPending}
                    >
                      {notifyMutation.isPending ? 'Notificando...' : 'Notificar Próximos'}
                    </button>
                  </div>
                </div>
              </div>

              <div className={shared.tableWrapper}>
                {isLoading ? (
                  <div className={styles.loading}>Carregando fila...</div>
                ) : (
                  <table className={shared.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Telefone</th>
                        <th>Preferência</th>
                        <th>Status</th>
                        <th>Entrou em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((entry) => {
                        const s = statusLabel[entry.status];
                        return (
                          <tr key={entry.id}>
                            <td className={`${shared.tdMono} ${styles.position}`}>#{entry.position}</td>
                            <td className={shared.tdBold}>{entry.name}</td>
                            <td className={shared.tdMuted}>{entry.email}</td>
                            <td className={shared.tdMono}>{entry.phone}</td>
                            <td>{entry.batchPreference}</td>
                            <td>
                              <span className={`${shared.badge} ${s.cls}`}>{s.label}</span>
                            </td>
                            <td className={shared.tdMuted}>{fmt(entry.joinedAt)}</td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr className={shared.emptyRow}>
                          <td colSpan={7}>Nenhum registro encontrado</td>
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

export default AdminWaitlist;
