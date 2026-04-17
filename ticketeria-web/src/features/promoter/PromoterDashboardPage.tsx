import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { PublicLayout } from '@shared/layout/PublicLayout/PublicLayout';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import { EmptyState } from '@shared/ui/EmptyState/EmptyState';
import styles from './PromoterDashboardPage.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface PromoterEvent {
  id: string;
  title: string;
  startDate: string;
}

interface PromoterGuest {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'checked_in';
  checkedInAt: string | null;
}

interface PromoterDashboard {
  promoter: {
    id: string;
    name: string;
    slug: string;
    tier: 'gold' | 'silver' | 'bronze';
    shareLink: string;
  };
  events: PromoterEvent[];
  selectedEvent: string;
  kpis: {
    totalGuests: number;
    checkIns: number;
    conversionPct: number;
    rank: number;
    totalPromoters: number;
  };
  guests: PromoterGuest[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  gold:   { label: 'Ouro',   cls: styles.tierGold },
  silver: { label: 'Prata',  cls: styles.tierSilver },
  bronze: { label: 'Bronze', cls: styles.tierBronze },
};

// ── KPI Card ──────────────────────────────────────────────────────────────

interface KpiProps {
  label: string;
  value: string;
  sub?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

const KpiCard: React.FC<KpiProps> = ({ label, value, sub, color = 'blue' }) => (
  <div className={`${styles.kpiCard} ${styles[`kpiColor_${color}`]}`}>
    <p className={styles.kpiLabel}>{label}</p>
    <p className={styles.kpiValue}>{value}</p>
    {sub && <p className={styles.kpiSub}>{sub}</p>}
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────

const PromoterDashboardPage: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['promoter-dashboard', selectedEventId],
    queryFn: async () => {
      const url = selectedEventId
        ? `/v1/promoters/me/dashboard?eventId=${selectedEventId}`
        : '/v1/promoters/me/dashboard';
      const response = await api.get<PromoterDashboard>(url);
      if (response.error) throw new Error(response.error);
      return response.data!;
    },
  });

  const copyLink = () => {
    if (dashboard?.promoter.shareLink) {
      navigator.clipboard.writeText(dashboard.promoter.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <PublicLayout>
      <div className={styles.page}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Painel do Promoter</h1>
            {dashboard && (
              <div className={styles.promoterInfo}>
                <span className={styles.promoterName}>{dashboard.promoter.name}</span>
                {TIER_CONFIG[dashboard.promoter.tier] && (
                  <span className={`${styles.tierBadge} ${TIER_CONFIG[dashboard.promoter.tier].cls}`}>
                    {TIER_CONFIG[dashboard.promoter.tier].label}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Event selector */}
          {dashboard?.events && dashboard.events.length > 0 && (
            <select
              className={styles.eventSelect}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">Todos os eventos</option>
              {dashboard.events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          )}
        </div>

        {isLoading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height="100px" borderRadius="12px" />
            ))}
          </div>
        ) : dashboard ? (
          <>
            {/* ── Share Link ── */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Seu Link de Compartilhamento</h2>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.shareDesc}>
                  Compartilhe este link com seus convidados para registrá-los na lista de convidados.
                </p>
                <div className={styles.shareLinkRow}>
                  <div className={styles.shareLinkBox}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                    </svg>
                    <span className={styles.shareUrl}>{dashboard.promoter.shareLink}</span>
                  </div>
                  <button
                    className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`}
                    onClick={copyLink}
                  >
                    {copied ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copiado!
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        Copiar Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── KPIs ── */}
            <div className={styles.kpiGrid}>
              <KpiCard
                label="Total Convidados"
                value={dashboard.kpis.totalGuests.toLocaleString('pt-BR')}
                color="blue"
              />
              <KpiCard
                label="Check-ins"
                value={dashboard.kpis.checkIns.toLocaleString('pt-BR')}
                color="green"
              />
              <KpiCard
                label="Conversão"
                value={`${dashboard.kpis.conversionPct.toFixed(1)}%`}
                color="orange"
              />
              <KpiCard
                label="Ranking"
                value={`#${dashboard.kpis.rank}`}
                sub={`de ${dashboard.kpis.totalPromoters} promoters`}
                color="purple"
              />
            </div>

            {/* ── Guest List Table ── */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  Lista de Convidados
                  <span className={styles.guestCount}>{dashboard.guests.length}</span>
                </h2>
              </div>

              {dashboard.guests.length === 0 ? (
                <div className={styles.emptyWrap}>
                  <EmptyState
                    title="Nenhum convidado ainda"
                    description="Compartilhe seu link para que os convidados se registrem."
                  />
                </div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Status</th>
                        <th>Check-in em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.guests.map((guest) => (
                        <tr key={guest.id}>
                          <td className={styles.tdName}>{guest.name}</td>
                          <td className={styles.tdEmail}>{guest.email}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${guest.status === 'checked_in' ? styles.statusCheckedIn : styles.statusPending}`}>
                              {guest.status === 'checked_in' ? 'Check-in feito' : 'Pendente'}
                            </span>
                          </td>
                          <td className={styles.tdDate}>{formatDate(guest.checkedInAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </PublicLayout>
  );
};

export default PromoterDashboardPage;
