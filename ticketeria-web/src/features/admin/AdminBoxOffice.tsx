import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import { formatCurrency } from '@shared/lib/formatters';
import shared from './admin.shared.module.css';
import styles from './AdminBoxOffice.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface AdminEvent {
  id: string;
  title: string;
  startDate: string;
}

interface Batch {
  id: string;
  name: string;
  type: string;
  price: number;
  available: number;
}

interface Sale {
  id: string;
  guestName: string;
  batchName: string;
  amountCents: number;
  soldAt: string;
}

interface Session {
  id: string;
  active: boolean;
  startedAt: string;
  endedAt?: string;
  ticketsSold: number;
  revenueCents: number;
}

// ── Sell Form ─────────────────────────────────────────────────────────────

interface SellFormProps {
  batches: Batch[];
  onSell: (data: { guestName: string; batchId: string }) => void;
  isLoading: boolean;
}

const SellForm: React.FC<SellFormProps> = ({ batches, onSell, isLoading }) => {
  const [guestQuery, setGuestQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestQuery.trim() || !selectedBatch) return;
    onSell({ guestName: guestQuery.trim(), batchId: selectedBatch });
    setGuestQuery('');
    setSelectedBatch('');
  };

  const selectedBatchData = batches.find((b) => b.id === selectedBatch);

  return (
    <form className={styles.sellForm} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Buscar por nome ou CPF</label>
          <div className={styles.searchField}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.input}
              type="text"
              placeholder="Nome completo ou CPF"
              value={guestQuery}
              onChange={(e) => setGuestQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Lote</label>
          <select
            className={styles.select}
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option value="">— Selecione o lote —</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id} disabled={b.available === 0}>
                {b.name} — {formatCurrency(b.price)} ({b.available > 0 ? `${b.available} disp.` : 'Esgotado'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedBatchData && (
        <div className={styles.sellPreview}>
          <span>Venda:</span>
          <strong>{selectedBatchData.name}</strong>
          <span className={styles.previewPrice}>{formatCurrency(selectedBatchData.price)}</span>
        </div>
      )}

      <button
        type="submit"
        className={shared.btnPrimary}
        disabled={!guestQuery.trim() || !selectedBatch || isLoading}
      >
        {isLoading ? 'Vendendo...' : '+ Vender Ingresso'}
      </button>
    </form>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

const AdminBoxOffice: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [localSales, setLocalSales] = useState<Sale[]>([]);

  const { data: events = [] } = useQuery<AdminEvent[]>({
    queryKey: ['admin-events-dropdown'],
    queryFn: async () => {
      const r = await api.get<{ events: AdminEvent[]; total: number }>('/v1/admin/events?limit=100');
      return r.data?.events ?? [];
    },
  });

  const { data: batches = [] } = useQuery<Batch[]>({
    queryKey: ['box-office-batches', selectedEventId],
    queryFn: async () => {
      const r = await api.get<Batch[]>(`/v1/admin/box-office/batches?eventId=${selectedEventId}`);
      return r.data ?? [];
    },
    enabled: !!selectedEventId && !!session?.active,
  });

  const startSessionMutation = useMutation({
    mutationFn: () => api.post<Session>('/v1/admin/box-office/sessions', { eventId: selectedEventId }),
    onSuccess: (r) => {
      if (r.data) {
        setSession(r.data);
        setLocalSales([]);
      }
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: () => api.post(`/v1/admin/box-office/sessions/${session!.id}/end`, {}),
    onSuccess: () => {
      setSession((s) => s ? { ...s, active: false, endedAt: new Date().toISOString() } : null);
    },
  });

  const sellMutation = useMutation({
    mutationFn: (data: { guestName: string; batchId: string }) =>
      api.post<Sale>(`/v1/admin/box-office/sessions/${session!.id}/sell`, data),
    onSuccess: (r) => {
      if (r.data) {
        setLocalSales((prev) => [r.data!, ...prev]);
      }
    },
  });

  const sales = localSales;
  const totalRevenue = sales.reduce((sum, s) => sum + s.amountCents, 0);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <AdminLayout>
      <div className={shared.page}>
        {/* ── Header ── */}
        <div className={shared.pageHeader}>
          <div>
            <h1 className={shared.pageTitle}>Bilheteria</h1>
            <p className={shared.pageSubtitle}>Venda de ingressos no local do evento</p>
          </div>
        </div>

        {/* ── Event Selector ── */}
        <div className={shared.card}>
          <div className={shared.cardHeader}>
            <h2 className={shared.cardTitle}>Selecionar Evento</h2>
          </div>
          <div className={shared.cardBody}>
            <div className={styles.eventSelectorRow}>
              <select
                className={styles.eventSelect}
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  setSession(null);
                  setLocalSales([]);
                }}
                disabled={!!session?.active}
              >
                <option value="">— Selecione um evento —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>

              {selectedEventId && !session?.active && (
                <button
                  className={styles.sessionBtn}
                  onClick={() => startSessionMutation.mutate()}
                  disabled={startSessionMutation.isPending}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
                  </svg>
                  {startSessionMutation.isPending ? 'Iniciando...' : 'Iniciar Sessão'}
                </button>
              )}

              {session?.active && (
                <button
                  className={`${styles.sessionBtn} ${styles.sessionBtnEnd}`}
                  onClick={() => {
                    if (window.confirm('Encerrar a sessão de bilheteria?')) {
                      endSessionMutation.mutate();
                    }
                  }}
                  disabled={endSessionMutation.isPending}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                  {endSessionMutation.isPending ? 'Encerrando...' : 'Encerrar Sessão'}
                </button>
              )}
            </div>

            {session && (
              <div className={`${styles.sessionStatus} ${session.active ? styles.sessionActive : styles.sessionEnded}`}>
                <span className={styles.sessionDot} />
                <span>
                  Sessão {session.active ? 'em andamento' : 'encerrada'} — iniciada às {formatTime(session.startedAt)}
                  {session.endedAt && ` · encerrada às ${formatTime(session.endedAt)}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {session && (
          <>
            {/* ── Session Stats ── */}
            <div className={shared.kpiRow}>
              <div className={shared.kpiMini}>
                <p className={shared.kpiMiniLabel}>Ingressos Vendidos</p>
                <p className={shared.kpiMiniValue}>{sales.length}</p>
              </div>
              <div className={shared.kpiMini}>
                <p className={shared.kpiMiniLabel}>Receita da Sessão</p>
                <p className={shared.kpiMiniValue}>{formatCurrency(totalRevenue)}</p>
              </div>
              <div className={shared.kpiMini}>
                <p className={shared.kpiMiniLabel}>Ticket Médio</p>
                <p className={shared.kpiMiniValue}>
                  {sales.length > 0 ? formatCurrency(Math.round(totalRevenue / sales.length)) : '—'}
                </p>
              </div>
            </div>

            {/* ── Quick Sell ── */}
            {session.active && (
              <div className={shared.card}>
                <div className={shared.cardHeader}>
                  <h2 className={shared.cardTitle}>Venda Rápida</h2>
                </div>
                <div className={shared.cardBody}>
                  <SellForm
                    batches={batches}
                    onSell={(data) => sellMutation.mutate(data)}
                    isLoading={sellMutation.isPending}
                  />
                  {sellMutation.isSuccess && (
                    <div className={styles.successAlert}>
                      Ingresso vendido com sucesso!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Sales Table ── */}
            <div className={shared.card}>
              <div className={shared.cardHeader}>
                <h2 className={shared.cardTitle}>Vendas desta sessão</h2>
              </div>

              {sales.length === 0 ? (
                <div className={styles.emptySales}>Nenhuma venda registrada nesta sessão.</div>
              ) : (
                <div className={shared.tableWrapper}>
                  <table className={shared.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Comprador</th>
                        <th>Lote</th>
                        <th>Valor</th>
                        <th>Horário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale, idx) => (
                        <tr key={sale.id}>
                          <td className={shared.tdMono}>{sales.length - idx}</td>
                          <td className={shared.tdBold}>{sale.guestName}</td>
                          <td>{sale.batchName}</td>
                          <td className={shared.tdBold}>{formatCurrency(sale.amountCents)}</td>
                          <td className={shared.tdMuted}>{formatTime(sale.soldAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBoxOffice;
