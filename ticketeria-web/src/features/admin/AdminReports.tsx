import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import { formatCurrency } from '@shared/lib/formatters';
import styles from './admin.shared.module.css';

interface ReportsData {
  salesByCategory: { category: string; sales: number; revenue: number }[];
  salesByState: { state: string; sales: number; revenue: number }[];
  topOrganizers: { id: string; name: string; events: number; revenue: number; rating: number }[];
  conversionFunnel: { stage: string; count: number; pct: number }[];
}

const BAR_COLORS: Record<string, string> = {
  shows: '#6C5CE7', festas: '#F59E0B', tecnologia: '#3B82F6',
  forró: '#10B981', eletrônica: '#EC4899', moda: '#8B5CF6',
  gastronomia: '#EF4444', outros: '#6B7280',
};

const AdminReports: React.FC = () => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', period],
    queryFn: async () => {
      const res = await api.get<ReportsData>(`/v1/admin/reports?period=${period}`);
      return res.data!;
    },
  });

  const salesByCategory = data?.salesByCategory ?? [];
  const salesByState    = data?.salesByState ?? [];
  const topOrganizers   = data?.topOrganizers ?? [];
  const funnel          = data?.conversionFunnel ?? [];

  const maxCatRevenue = Math.max(...salesByCategory.map(c => c.revenue), 1);
  const maxStateRevenue = Math.max(...salesByState.map(s => s.revenue), 1);

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Relatórios</h1>
            <p className={styles.pageSubtitle}>Análises e métricas de desempenho</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', background: '#F3F4F6', borderRadius: 'var(--radius-md)', padding: 3 }}>
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: '6px 16px', background: period === p ? '#fff' : 'transparent', border: 'none', borderRadius: 'calc(var(--radius-md) - 2px)', fontWeight: period === p ? 600 : 400, fontSize: 'var(--text-sm)', color: period === p ? '#1F2937' : '#6B7280', cursor: 'pointer', boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          {/* Vendas por categoria */}
          <div className={styles.card}>
            <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Vendas por categoria</h2></div>
            <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ height: 36, background: '#F3F4F6', borderRadius: 6 }} />) : (
                salesByCategory.map((c) => (
                  <div key={c.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{c.category}</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: '#6B7280' }}>{c.sales.toLocaleString('pt-BR')} vendas · {formatCurrency(c.revenue)}</span>
                    </div>
                    <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(c.revenue / maxCatRevenue) * 100}%`, height: '100%', background: BAR_COLORS[c.category] ?? '#6B7280', borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Funil de conversão */}
          <div className={styles.card}>
            <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Funil de conversão</h2></div>
            <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: 48, background: '#F3F4F6', borderRadius: 6 }} />) : (
                funnel.map((f, i) => (
                  <div key={f.stage} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--text-xs)', flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#374151' }}>{f.stage}</span>
                        <span style={{ fontSize: 'var(--text-sm)', color: '#6B7280' }}>{f.count.toLocaleString('pt-BR')} ({f.pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${f.pct}%`, height: '100%', background: `hsl(${220 - i * 30}, 80%, 55%)`, borderRadius: 3 }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          {/* Por estado */}
          <div className={styles.card}>
            <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Top estados</h2></div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead><tr><th>Estado</th><th>Vendas</th><th>Receita</th><th>Share</th></tr></thead>
                <tbody>
                  {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 4 }).map((__, j) => <td key={j}><div style={{ height: 14, background: '#F3F4F6', borderRadius: 4 }} /></td>)}</tr>
                  )) : salesByState.map((s) => (
                    <tr key={s.state}>
                      <td className={styles.tdBold}>{s.state}</td>
                      <td className={styles.tdMuted}>{s.sales.toLocaleString('pt-BR')}</td>
                      <td className={styles.tdBold}>{formatCurrency(s.revenue)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 48, height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${(s.revenue / maxStateRevenue) * 100}%`, height: '100%', background: '#3B82F6', borderRadius: 2 }} />
                          </div>
                          <span className={styles.tdMuted}>{Math.round((s.revenue / maxStateRevenue) * 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top organizadores */}
          <div className={styles.card}>
            <div className={styles.cardHeader}><h2 className={styles.cardTitle}>Top organizadores</h2></div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead><tr><th>Organizador</th><th>Eventos</th><th>Receita</th><th>Rating</th></tr></thead>
                <tbody>
                  {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 4 }).map((__, j) => <td key={j}><div style={{ height: 14, background: '#F3F4F6', borderRadius: 4 }} /></td>)}</tr>
                  )) : topOrganizers.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <div className={styles.avatarCell}>
                          <div className={styles.avatarInitials} style={{ background: '#EDE9FE', color: '#7C3AED' }}>{o.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
                          <span className={styles.avatarName}>{o.name}</span>
                        </div>
                      </td>
                      <td className={styles.tdMuted}>{o.events}</td>
                      <td className={styles.tdBold}>{formatCurrency(o.revenue)}</td>
                      <td>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        <span className={styles.tdBold} style={{ marginLeft: 2 }}>{o.rating.toFixed(1)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
