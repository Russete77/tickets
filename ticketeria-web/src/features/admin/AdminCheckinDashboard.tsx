import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import { useSocket } from '@shared/hooks/useSocket';
import styles from './AdminCheckinDashboard.module.css';

// ── Types ─────────────────────────────────────────
interface CheckinStats {
  total: number;
  checkedIn: number;
  remaining: number;
  percentage: number;
  zones?: ZoneStat[];
  hourly?: HourlyPoint[];
  byOperator?: OperatorStat[];
  byBatchType?: BatchStat[];
}

interface ZoneStat {
  zone: string;
  capacity: number;
  checkedIn: number;
}

interface HourlyPoint {
  hour: string;
  count: number;
}

interface OperatorStat {
  operator: string;
  count: number;
}

interface BatchStat {
  batchType: string;
  count: number;
}

interface RecentCheckin {
  id: string;
  holderName: string;
  batchType: string;
  ticketNumber: string;
  checkedInAt: string;
  status: 'valid' | 'invalid' | 'warning';
}

interface MockEvent {
  id: string;
  label: string;
}

const MOCK_EVENTS: MockEvent[] = [
  { id: 'evt-001', label: 'Lollapalooza Brasil 2025' },
  { id: 'evt-012', label: 'Ultra Music Festival Brasil' },
  { id: 'evt-003', label: 'Rock in Rio 2025' },
  { id: 'evt-002', label: 'Coldplay Tour 2025' },
];

// ── Helpers ───────────────────────────────────────
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  return `${Math.floor(diff / 3600)}h atrás`;
}

// ── Sub-components ────────────────────────────────
const KpiCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}> = ({ label, value, sub, color = 'blue' }) => (
  <div className={`${styles.kpiCard} ${styles[`kpi_${color}`]}`}>
    <p className={styles.kpiLabel}>{label}</p>
    <p className={styles.kpiValue}>{value}</p>
    {sub && <p className={styles.kpiSub}>{sub}</p>}
  </div>
);

const StatusBadge: React.FC<{ status: RecentCheckin['status'] }> = ({ status }) => {
  const map = {
    valid:   { label: 'Válido',   cls: styles.badgeValid },
    invalid: { label: 'Inválido', cls: styles.badgeInvalid },
    warning: { label: 'Atenção',  cls: styles.badgeWarning },
  };
  const { label, cls } = map[status];
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
};

const CapacityChart: React.FC<{ zones: ZoneStat[] }> = ({ zones }) => (
  <div className={styles.capacityChart}>
    {zones.map((z) => {
      const pct = Math.round((z.checkedIn / Math.max(z.capacity, 1)) * 100);
      return (
        <div key={z.zone} className={styles.zoneRow}>
          <div className={styles.zoneLabel}>
            <span>{z.zone}</span>
            <span className={styles.zoneMeta}>{z.checkedIn.toLocaleString('pt-BR')} / {z.capacity.toLocaleString('pt-BR')}</span>
          </div>
          <div className={styles.zoneBar}>
            <div
              className={`${styles.zoneFill} ${pct >= 90 ? styles.zoneFillDanger : pct >= 70 ? styles.zoneFillWarn : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={styles.zonePct}>{pct}%</span>
        </div>
      );
    })}
  </div>
);

const HourlyChart: React.FC<{ data: HourlyPoint[] }> = ({ data }) => {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className={styles.hourlyChart}>
      {data.map((point) => (
        <div key={point.hour} className={styles.hourBarGroup}>
          <div
            className={styles.hourBar}
            style={{ height: `${(point.count / max) * 100}%` }}
            title={`${point.count} check-ins`}
          />
          <span className={styles.hourLabel}>{point.hour}</span>
        </div>
      ))}
    </div>
  );
};

// ── Page ──────────────────────────────────────────
const AdminCheckinDashboard: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<string>(MOCK_EVENTS[0].id);
  const [liveFeed, setLiveFeed] = useState<RecentCheckin[]>([]);

  // ── Stats query ──
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['checkin-stats', selectedEvent],
    queryFn: async () => {
      const res = await api.get<CheckinStats>(`/v1/checkin/stats/${selectedEvent}`);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    refetchInterval: 15_000,
  });

  // ── Recent check-ins query ──
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['checkin-recent', selectedEvent],
    queryFn: async () => {
      const res = await api.get<RecentCheckin[]>(`/v1/checkin/recent/${selectedEvent}`);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    refetchInterval: 10_000,
  });

  // Seed live feed from query data
  useEffect(() => {
    if (recentData) {
      setLiveFeed(recentData);
    }
  }, [recentData]);

  // ── Socket.IO: listen for real-time check-ins ──
  const { on } = useSocket({ namespace: '/checkin', autoConnect: true });

  const handleCheckinEvent = useCallback((data: RecentCheckin) => {
    setLiveFeed((prev) => [data, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const off = on<RecentCheckin>('checkin:success', handleCheckinEvent);
    return off;
  }, [on, handleCheckinEvent]);

  // ── Derived zone data (enrich stats mock) ──
  const zones: ZoneStat[] = stats
    ? [
        { zone: 'Pista Geral', capacity: Math.round(stats.total * 0.55), checkedIn: Math.round(stats.checkedIn * 0.58) },
        { zone: 'VIP',         capacity: Math.round(stats.total * 0.25), checkedIn: Math.round(stats.checkedIn * 0.22) },
        { zone: 'Camarote',    capacity: Math.round(stats.total * 0.12), checkedIn: Math.round(stats.checkedIn * 0.12) },
        { zone: 'Backstage',   capacity: Math.round(stats.total * 0.08), checkedIn: Math.round(stats.checkedIn * 0.08) },
      ]
    : [];

  const hourlyData: HourlyPoint[] = stats
    ? [
        { hour: '14h', count: Math.round(stats.checkedIn * 0.03) },
        { hour: '15h', count: Math.round(stats.checkedIn * 0.07) },
        { hour: '16h', count: Math.round(stats.checkedIn * 0.14) },
        { hour: '17h', count: Math.round(stats.checkedIn * 0.22) },
        { hour: '18h', count: Math.round(stats.checkedIn * 0.25) },
        { hour: '19h', count: Math.round(stats.checkedIn * 0.18) },
        { hour: '20h', count: Math.round(stats.checkedIn * 0.08) },
        { hour: '21h', count: Math.round(stats.checkedIn * 0.03) },
      ]
    : [];

  const byOperator: OperatorStat[] = stats
    ? [
        { operator: 'Operador A', count: Math.round(stats.checkedIn * 0.33) },
        { operator: 'Operador B', count: Math.round(stats.checkedIn * 0.28) },
        { operator: 'Operador C', count: Math.round(stats.checkedIn * 0.22) },
        { operator: 'Operador D', count: Math.round(stats.checkedIn * 0.17) },
      ]
    : [];

  const byBatch: BatchStat[] = stats
    ? [
        { batchType: '1º Lote', count: Math.round(stats.checkedIn * 0.45) },
        { batchType: 'VIP',     count: Math.round(stats.checkedIn * 0.30) },
        { batchType: 'Camarote',count: Math.round(stats.checkedIn * 0.15) },
        { batchType: 'Cortesia',count: Math.round(stats.checkedIn * 0.10) },
      ]
    : [];

  const isLoading = statsLoading || recentLoading;

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard Check-in</h1>
            <p className={styles.pageSubtitle}>Monitoramento em tempo real de acessos</p>
          </div>
          <div className={styles.eventSelector}>
            <label className={styles.selectorLabel} htmlFor="event-select">Evento</label>
            <select
              id="event-select"
              className={styles.selectorInput}
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              {MOCK_EVENTS.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className={styles.kpiGrid}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height="100px" borderRadius="12px" />
            ))
          ) : (
            <>
              <KpiCard label="Total de Ingressos" value={(stats?.total ?? 0).toLocaleString('pt-BR')} color="blue" />
              <KpiCard label="Check-ins Realizados" value={(stats?.checkedIn ?? 0).toLocaleString('pt-BR')} color="green" />
              <KpiCard label="Aguardando Entrada" value={(stats?.remaining ?? 0).toLocaleString('pt-BR')} color="orange" />
              <KpiCard
                label="Taxa de Check-in"
                value={`${stats?.percentage ?? 0}%`}
                sub={stats ? (stats.percentage >= 80 ? 'Lotação quase completa' : 'Em andamento') : undefined}
                color="purple"
              />
            </>
          )}
        </div>

        {/* ── Middle section ── */}
        <div className={styles.middleRow}>
          {/* Live Feed */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Feed ao Vivo</h2>
              <span className={styles.liveIndicator}>
                <span className={styles.liveDot} />
                Ao vivo
              </span>
            </div>
            <div className={styles.liveFeed}>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} width="100%" height="56px" borderRadius="8px" />
                ))
              ) : liveFeed.length === 0 ? (
                <p className={styles.emptyFeed}>Nenhum check-in registrado ainda.</p>
              ) : (
                liveFeed.map((checkin) => (
                  <div key={checkin.id} className={styles.feedItem}>
                    <div className={styles.feedAvatar}>
                      {checkin.holderName.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.feedInfo}>
                      <p className={styles.feedName}>{checkin.holderName}</p>
                      <p className={styles.feedMeta}>{checkin.batchType} · {relativeTime(checkin.checkedInAt)}</p>
                    </div>
                    <StatusBadge status={checkin.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Capacity chart */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Capacidade por Área</h2>
            </div>
            {isLoading ? (
              <Skeleton width="100%" height="200px" borderRadius="8px" />
            ) : (
              <CapacityChart zones={zones} />
            )}
          </div>
        </div>

        {/* ── Bottom section ── */}
        <div className={styles.bottomRow}>
          {/* Hourly chart */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Check-ins por Hora</h2>
            </div>
            {isLoading ? (
              <Skeleton width="100%" height="180px" borderRadius="8px" />
            ) : (
              <HourlyChart data={hourlyData} />
            )}
          </div>

          {/* Stats tables */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Estatísticas Detalhadas</h2>
            </div>
            {isLoading ? (
              <Skeleton width="100%" height="180px" borderRadius="8px" />
            ) : (
              <div className={styles.statsTables}>
                {/* By operator */}
                <div className={styles.statsSection}>
                  <h3 className={styles.statsSubtitle}>Por Operador</h3>
                  <table className={styles.statsTable}>
                    <tbody>
                      {byOperator.map((row) => (
                        <tr key={row.operator}>
                          <td>{row.operator}</td>
                          <td className={styles.statsCount}>{row.count.toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* By batch */}
                <div className={styles.statsSection}>
                  <h3 className={styles.statsSubtitle}>Por Tipo de Ingresso</h3>
                  <table className={styles.statsTable}>
                    <tbody>
                      {byBatch.map((row) => (
                        <tr key={row.batchType}>
                          <td>{row.batchType}</td>
                          <td className={styles.statsCount}>{row.count.toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCheckinDashboard;
