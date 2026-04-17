import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import { formatCurrency } from '@shared/lib/formatters';
import { Icon, IconName } from '@shared/ui/Icon/Icon';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import styles from './AdminAffiliates.module.css';
import sharedStyles from './admin.shared.module.css';

// ── Types ──────────────────────────────────────
interface AffiliateLink {
  id: string;
  code: string;
  eventId: string;
  eventTitle: string;
  commissionPercentage: number;
  clicks: number;
  conversions: number;
  totalEarned: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface TopAffiliate {
  id: string;
  name: string;
  email: string;
  totalSales: number;
  totalCommission: number;
  conversionRate: number;
  rank: number;
}

interface CommissionHistory {
  id: string;
  date: string;
  affiliateName: string;
  affiliateEmail: string;
  eventTitle: string;
  saleAmount: number;
  commissionPercentage: number;
  commissionValue: number;
  status: 'pending' | 'paid';
}

interface AffiliateStats {
  totalAffiliates: number;
  totalClicks: number;
  totalConversions: number;
  totalCommissionsCents: number;
}

interface AffiliatesData {
  links: AffiliateLink[];
  topAffiliates: TopAffiliate[];
  commissionHistory: CommissionHistory[];
  stats: AffiliateStats;
}

// ── KPI Card ──────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string;
  icon: IconName;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color = 'blue' }) => (
  <div className={`${sharedStyles.kpiCard} ${sharedStyles[`kpiColor_${color}`]}`}>
    <div className={sharedStyles.kpiIcon}><Icon name={icon} size={24} /></div>
    <div className={sharedStyles.kpiBody}>
      <p className={sharedStyles.kpiTitle}>{title}</p>
      <p className={sharedStyles.kpiValue}>{value}</p>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────
const AdminAffiliates: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<string>('evt-001');
  const [commissionPercentage, setCommissionPercentage] = useState<number>(10);

  // ── Data query ──
  const { data, isLoading } = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn: async () => {
      const res = await api.get<AffiliatesData>('/v1/admin/affiliates');
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  // ── Create link mutation ──
  const createLink = useMutation({
    mutationFn: async (payload: { eventId: string; commissionPercentage: number }) => {
      const res = await api.post<AffiliateLink>('/v1/admin/affiliates', payload);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
    },
  });

  // ── Deactivate mutation ──
  const deactivate = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<{ id: string; status: string }>(`/v1/admin/affiliates/${id}/deactivate`, {});
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
    },
  });

  const links = data?.links ?? [];
  const affiliates = data?.topAffiliates ?? [];
  const commissions = data?.commissionHistory ?? [];
  const stats = data?.stats;

  const handleGenerateLink = () => {
    createLink.mutate({ eventId: selectedEvent, commissionPercentage });
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/affiliate/${code}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado para a área de transferência!');
  };

  const handleDeactivateLink = (id: string) => {
    deactivate.mutate(id);
  };

  const statusLabel: Record<string, { label: string; cls: string }> = {
    active:   { label: 'Ativo',    cls: sharedStyles.badgeGreen },
    inactive: { label: 'Inativo',  cls: sharedStyles.badgeRed   },
    paid:     { label: 'Pago',     cls: sharedStyles.badgeGreen },
    pending:  { label: 'Pendente', cls: sharedStyles.badgeYellow },
  };

  return (
    <AdminLayout>
      <div className={sharedStyles.page}>
        {/* Header */}
        <div className={sharedStyles.pageHeader}>
          <div>
            <h1 className={sharedStyles.pageTitle}>Afiliados</h1>
            <p className={sharedStyles.pageSubtitle}>Gerenciamento de links, tracking e comissões</p>
          </div>
        </div>

        {/* KPI Grid */}
        <div className={sharedStyles.kpiGrid}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height="100px" borderRadius="12px" />
            ))
          ) : (
            <>
              <KpiCard
                title="Total de Afiliados"
                value={(stats?.totalAffiliates ?? 0).toString()}
                icon="users"
                color="blue"
              />
              <KpiCard
                title="Total de Cliques"
                value={(stats?.totalClicks ?? 0).toLocaleString('pt-BR')}
                icon="globe"
                color="green"
              />
              <KpiCard
                title="Conversões"
                value={(stats?.totalConversions ?? 0).toLocaleString('pt-BR')}
                icon="check-circle"
                color="orange"
              />
              <KpiCard
                title="Comissões Pagas"
                value={formatCurrency((stats?.totalCommissionsCents ?? 0) / 100)}
                icon="dollar-sign"
                color="purple"
              />
            </>
          )}
        </div>

        {/* Create Affiliate Link Section */}
        <div className={sharedStyles.card}>
          <div className={sharedStyles.cardHeader}>
            <h2 className={sharedStyles.cardTitle}>Criar Link de Afiliado</h2>
          </div>
          <div className={styles.formContainer}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Evento (ID)</label>
              <input
                type="text"
                className={styles.input}
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                placeholder="evt-001"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Comissão (%)</label>
              <input
                type="number"
                className={styles.input}
                min="1"
                max="50"
                value={commissionPercentage}
                onChange={(e) => setCommissionPercentage(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
              />
            </div>
            <button
              className={sharedStyles.btnPrimary}
              onClick={handleGenerateLink}
              disabled={createLink.isPending}
            >
              <Icon name="plus" size={16} />
              {createLink.isPending ? 'Gerando...' : 'Gerar Link'}
            </button>
          </div>
        </div>

        {/* Active Links Table */}
        <div className={sharedStyles.card}>
          <div className={sharedStyles.cardHeader}>
            <h2 className={sharedStyles.cardTitle}>Links Ativos</h2>
          </div>
          <div className={sharedStyles.tableWrapper}>
            <table className={sharedStyles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Evento</th>
                  <th>Cliques</th>
                  <th>Conversões</th>
                  <th>Taxa Conv.</th>
                  <th>Comissão %</th>
                  <th>Ganhos</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className={sharedStyles.emptyRow}>Carregando...</td>
                  </tr>
                ) : links.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={sharedStyles.emptyRow}>
                      Nenhum link de afiliado criado
                    </td>
                  </tr>
                ) : (
                  links.map((link) => {
                    const conversionRate = link.clicks > 0
                      ? ((link.conversions / link.clicks) * 100).toFixed(2)
                      : '0.00';
                    const s = statusLabel[link.status] ?? { label: link.status, cls: sharedStyles.badgeGray };
                    return (
                      <tr key={link.id}>
                        <td className={sharedStyles.tdMono}>{link.code}</td>
                        <td>{link.eventTitle}</td>
                        <td className={sharedStyles.tdBold}>{link.clicks.toLocaleString('pt-BR')}</td>
                        <td className={sharedStyles.tdBold}>{link.conversions.toLocaleString('pt-BR')}</td>
                        <td>{conversionRate}%</td>
                        <td>{link.commissionPercentage}%</td>
                        <td className={sharedStyles.tdBold}>{formatCurrency(link.totalEarned)}</td>
                        <td>
                          <span className={`${sharedStyles.badge} ${s.cls}`}>
                            {s.label}
                          </span>
                        </td>
                        <td>
                          <div className={sharedStyles.actions}>
                            <button
                              className={sharedStyles.actionBtn}
                              title="Copiar Link"
                              onClick={() => handleCopyLink(link.code)}
                            >
                              <Icon name="share" size={14} />
                            </button>
                            {link.status === 'active' && (
                              <button
                                className={`${sharedStyles.actionBtn} ${sharedStyles.actionBtnDanger}`}
                                title="Desativar"
                                onClick={() => handleDeactivateLink(link.id)}
                                disabled={deactivate.isPending}
                              >
                                <Icon name="x" size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Affiliates Ranking */}
        <div className={sharedStyles.card}>
          <div className={sharedStyles.cardHeader}>
            <h2 className={sharedStyles.cardTitle}>Ranking de Afiliados</h2>
          </div>
          <div className={styles.affiliatesList}>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} width="100%" height="72px" borderRadius="8px" />
              ))
            ) : (
              affiliates.map((aff) => (
                <div key={aff.id} className={styles.affiliateItem}>
                  <div className={styles.affiliateRank}>#{aff.rank}</div>
                  <div className={styles.affiliateInfo}>
                    <p className={styles.affiliateName}>{aff.name}</p>
                    <p className={styles.affiliateEmail}>{aff.email}</p>
                  </div>
                  <div className={styles.affiliateStats}>
                    <div className={styles.statBox}>
                      <p className={styles.statLabel}>Vendas</p>
                      <p className={styles.statValue}>{formatCurrency(aff.totalSales)}</p>
                    </div>
                    <div className={styles.statBox}>
                      <p className={styles.statLabel}>Comissão</p>
                      <p className={styles.statValue}>{formatCurrency(aff.totalCommission)}</p>
                    </div>
                    <div className={styles.statBox}>
                      <p className={styles.statLabel}>Taxa Conv.</p>
                      <p className={styles.statValue}>{aff.conversionRate.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Commission History */}
        <div className={sharedStyles.card}>
          <div className={sharedStyles.cardHeader}>
            <h2 className={sharedStyles.cardTitle}>Histórico de Comissões</h2>
          </div>
          <div className={sharedStyles.tableWrapper}>
            <table className={sharedStyles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Afiliado</th>
                  <th>Evento</th>
                  <th>Valor Venda</th>
                  <th>Comissão %</th>
                  <th>Valor Comissão</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className={sharedStyles.emptyRow}>Carregando...</td>
                  </tr>
                ) : commissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={sharedStyles.emptyRow}>
                      Nenhuma comissão registrada
                    </td>
                  </tr>
                ) : (
                  commissions.map((comm) => {
                    const s = statusLabel[comm.status] ?? { label: comm.status, cls: sharedStyles.badgeGray };
                    return (
                      <tr key={comm.id}>
                        <td className={sharedStyles.tdMuted}>{comm.date}</td>
                        <td>
                          <div>
                            <p className={sharedStyles.tdBold} style={{ margin: 0 }}>
                              {comm.affiliateName}
                            </p>
                            <p className={sharedStyles.tdMuted} style={{ margin: 0, fontSize: '11px' }}>
                              {comm.affiliateEmail}
                            </p>
                          </div>
                        </td>
                        <td className={sharedStyles.tdTruncate}>{comm.eventTitle}</td>
                        <td>{formatCurrency(comm.saleAmount)}</td>
                        <td>{comm.commissionPercentage}%</td>
                        <td className={sharedStyles.tdBold}>{formatCurrency(comm.commissionValue)}</td>
                        <td>
                          <span className={`${sharedStyles.badge} ${s.cls}`}>
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAffiliates;
