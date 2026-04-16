import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import { formatCurrency } from '@shared/lib/formatters';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import { Icon, IconName } from '@shared/ui/Icon/Icon';
import styles from './AdminDashboard.module.css';

interface DashboardStats {
  revenue: { total: number; growth: number };
  tickets: { total: number; growth: number };
  events: { total: number; active: number };
  users: { total: number; newThisMonth: number };
  recentOrders: RecentOrder[];
  topEvents: TopEvent[];
  revenueChart: ChartPoint[];
}

interface RecentOrder {
  id: string;
  customerName: string;
  eventTitle: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

interface TopEvent {
  id: string;
  title: string;
  sold: number;
  capacity: number;
  revenue: number;
}

interface ChartPoint {
  label: string;
  value: number;
}

// ── KPI Card ──────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string;
  growth?: number;
  icon: IconName;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, growth, icon, color = 'blue' }) => (
  <div className={`${styles.kpiCard} ${styles[`kpiColor_${color}`]}`}>
    <div className={styles.kpiIcon}><Icon name={icon} size={24} /></div>
    <div className={styles.kpiBody}>
      <p className={styles.kpiTitle}>{title}</p>
      <p className={styles.kpiValue}>{value}</p>
      {growth !== undefined && (
        <p className={`${styles.kpiGrowth} ${growth >= 0 ? styles.growthPos : styles.growthNeg}`}>
          {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}% vs mês anterior
        </p>
      )}
    </div>
  </div>
);

// ── Revenue Chart (pure CSS bars) ─────────────────
const RevenueChart: React.FC<{ data: ChartPoint[] }> = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className={styles.chart}>
      <div className={styles.chartBars}>
        {data.map((point) => (
          <div key={point.label} className={styles.chartBarGroup}>
            <div
              className={styles.chartBar}
              style={{ height: `${(point.value / max) * 100}%` }}
              title={formatCurrency(point.value)}
            />
            <span className={styles.chartLabel}>{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Status badge ──────────────────────────────────
const statusLabel: Record<string, { label: string; cls: string }> = {
  confirmed:  { label: 'Confirmado', cls: styles.statusConfirmed },
  pending:    { label: 'Pendente',   cls: styles.statusPending },
  cancelled:  { label: 'Cancelado',  cls: styles.statusCancelled },
};

// ── Page ──────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard', period],
    queryFn: async () => {
      const response = await api.get(`/v1/admin/dashboard?period=${period}`);
      return response.data as DashboardStats;
    },
    staleTime: 1000 * 60 * 5,
  });

  const periodOptions: { label: string; value: '7d' | '30d' | '90d' }[] = [
    { label: '7 dias', value: '7d' },
    { label: '30 dias', value: '30d' },
    { label: '90 dias', value: '90d' },
  ];

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.pageSubtitle}>Visão geral do desempenho</p>
          </div>
          <div className={styles.periodToggle}>
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.periodBtn} ${period === opt.value ? styles.periodBtnActive : ''}`}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className={styles.kpiGrid}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height="100px" borderRadius="12px" />
            ))
          ) : (
            <>
              <KpiCard
                title="Receita Total"
                value={formatCurrency(stats?.revenue.total ?? 0)}
                growth={stats?.revenue.growth}
                icon="dollar-sign"
                color="blue"
              />
              <KpiCard
                title="Ingressos Vendidos"
                value={(stats?.tickets.total ?? 0).toLocaleString('pt-BR')}
                growth={stats?.tickets.growth}
                icon="ticket"
                color="green"
              />
              <KpiCard
                title="Eventos Ativos"
                value={`${stats?.events.active ?? 0} / ${stats?.events.total ?? 0}`}
                icon="calendar"
                color="orange"
              />
              <KpiCard
                title="Usuários"
                value={(stats?.users.total ?? 0).toLocaleString('pt-BR')}
                growth={undefined}
                icon="users"
                color="purple"
              />
            </>
          )}
        </div>

        {/* ── Charts row ── */}
        <div className={styles.chartsRow}>
          {/* Revenue chart */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Receita por período</h2>
            </div>
            {isLoading ? (
              <Skeleton width="100%" height="200px" borderRadius="8px" />
            ) : (
              <RevenueChart data={stats?.revenueChart ?? []} />
            )}
          </div>

          {/* Top events */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Top Eventos</h2>
            </div>
            {isLoading ? (
              <Skeleton width="100%" height="200px" borderRadius="8px" />
            ) : (
              <div className={styles.topEventsList}>
                {(stats?.topEvents ?? []).map((event, i) => {
                  const pct = Math.round((event.sold / Math.max(event.capacity, 1)) * 100);
                  return (
                    <div key={event.id} className={styles.topEventItem}>
                      <span className={styles.topEventRank}>#{i + 1}</span>
                      <div className={styles.topEventInfo}>
                        <p className={styles.topEventTitle}>{event.title}</p>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                        </div>
                        <p className={styles.topEventMeta}>
                          {event.sold.toLocaleString('pt-BR')} / {event.capacity.toLocaleString('pt-BR')} ingressos • {formatCurrency(event.revenue)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent orders ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Pedidos Recentes</h2>
            <button className={styles.cardLink}>Ver todos</button>
          </div>
          {isLoading ? (
            <Skeleton width="100%" height="250px" borderRadius="8px" />
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Evento</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recentOrders ?? []).map((order) => {
                    const s = statusLabel[order.status] ?? { label: order.status, cls: '' };
                    return (
                      <tr key={order.id}>
                        <td className={styles.tdMono}>#{order.id.slice(-6).toUpperCase()}</td>
                        <td>{order.customerName}</td>
                        <td className={styles.tdTruncate}>{order.eventTitle}</td>
                        <td className={styles.tdBold}>{formatCurrency(order.amount)}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${s.cls}`}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
                    <tr>
                      <td colSpan={5} className={styles.emptyRow}>Nenhum pedido recente</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
