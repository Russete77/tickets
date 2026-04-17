import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import { formatDate, formatCurrency } from '@shared/lib/formatters';
import { downloadCSV } from '@shared/lib/csvExport';
import styles from './admin.shared.module.css';

interface AdminEvent {
  id: string;
  title: string;
  category: string;
  startDate: string;
  venue: { name: string; city: string; state: string };
  currentBatchPrice: number;
  sold: number;
  totalCapacity: number;
  status: 'published' | 'draft' | 'cancelled' | 'ended';
  organizer: string;
}

const STATUS_MAP: Record<AdminEvent['status'], { label: string; cls: string }> = {
  published: { label: 'Publicado', cls: styles.badgeGreen },
  draft:     { label: 'Rascunho',  cls: styles.badgeGray  },
  cancelled: { label: 'Cancelado', cls: styles.badgeRed   },
  ended:     { label: 'Encerrado', cls: styles.badgeYellow },
};

const PAGE_SIZE = 8;

const AdminEvents: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-events', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ search, status: statusFilter, page: String(page), limit: String(PAGE_SIZE) });
      const res = await api.get<{ events: AdminEvent[]; total: number }>(`/v1/admin/events?${params}`);
      return res.data!;
    },
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExport = () => {
    downloadCSV(
      events.map((ev) => ({
        ID: ev.id,
        Título: ev.title,
        Categoria: ev.category,
        Data: formatDate(ev.startDate),
        Cidade: ev.venue.city,
        Estado: ev.venue.state,
        'Preço mín.': formatCurrency(ev.currentBatchPrice),
        Vendidos: ev.sold,
        Capacidade: ev.totalCapacity,
        Status: ev.status,
        Organizador: ev.organizer,
      })),
      'eventos',
    );
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Excluir o evento "${title}"? Esta ação não pode ser desfeita.`)) return;
    await api.delete(`/v1/events/${id}`);
    queryClient.invalidateQueries({ queryKey: ['admin-events'] });
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Eventos</h1>
            <p className={styles.pageSubtitle}>{total} eventos cadastrados</p>
          </div>
          <button
            className={styles.btnPrimary}
            onClick={() => navigate('/admin/events/create')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo evento
          </button>
        </div>

        {/* Table card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.toolbar}>
              <div className={styles.searchWrapper}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Buscar por nome, cidade..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="all">Todos os status</option>
                <option value="published">Publicados</option>
                <option value="draft">Rascunhos</option>
                <option value="cancelled">Cancelados</option>
                <option value="ended">Encerrados</option>
              </select>
            </div>
            <button className={styles.btnSecondary} onClick={handleExport}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Categoria</th>
                  <th>Data</th>
                  <th>Local</th>
                  <th>Ingressos</th>
                  <th>Preço mín.</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j}><div className={styles.skeletonCell} style={{ width: j === 0 ? 160 : 80 }} /></td>
                      ))}
                    </tr>
                  ))
                ) : events.length === 0 ? (
                  <tr><td colSpan={8} className={styles.emptyRow} style={{ padding: '3rem' }}>Nenhum evento encontrado</td></tr>
                ) : (
                  events.map((ev) => {
                    const pct = Math.round((ev.sold / Math.max(ev.totalCapacity, 1)) * 100);
                    const s = STATUS_MAP[ev.status] ?? { label: ev.status, cls: styles.badgeGray };
                    return (
                      <tr key={ev.id}>
                        <td className={styles.tdBold}>{ev.title}</td>
                        <td><span className={`${styles.badge} ${styles.badgeBlue}`}>{ev.category}</span></td>
                        <td className={styles.tdMuted}>{formatDate(ev.startDate)}</td>
                        <td className={styles.tdMuted}>{ev.venue.city}, {ev.venue.state}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className={styles.inlineProgressTrack}>
                              <div className={`${styles.inlineProgressFill} ${pct > 90 ? styles.inlineProgressFillDanger : ''}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={styles.tdMuted}>{pct}%</span>
                          </div>
                        </td>
                        <td className={styles.tdBold}>{formatCurrency(ev.currentBatchPrice)}</td>
                        <td><span className={`${styles.badge} ${s.cls}`}>{s.label}</span></td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={styles.actionBtn}
                              title="Ver"
                              onClick={() => window.open(`/event/${(ev as AdminEvent & { slug?: string }).slug ?? ev.id}`, '_blank')}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button
                              className={styles.actionBtn}
                              title="Editar"
                              onClick={() => navigate(`/admin/events/edit/${ev.id}`)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                              title="Excluir"
                              onClick={() => handleDelete(ev.id, ev.title)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </span>
            <div className={styles.paginationBtns}>
              <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEvents;
