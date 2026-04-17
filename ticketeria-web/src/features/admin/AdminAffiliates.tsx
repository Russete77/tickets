import React, { useState } from 'react';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { formatCurrency } from '@shared/lib/formatters';
import { Icon, IconName } from '@shared/ui/Icon/Icon';
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

// ── Mock Data ──────────────────────────────────
const mockAffiliateLinks: AffiliateLink[] = [
  {
    id: '1',
    code: 'aff-tech-2024-001',
    eventId: 'evt-1',
    eventTitle: 'TechConf 2024',
    commissionPercentage: 10,
    clicks: 245,
    conversions: 18,
    totalEarned: 890.50,
    status: 'active',
    createdAt: '2024-03-15',
  },
  {
    id: '2',
    code: 'aff-music-fest-02',
    eventId: 'evt-2',
    eventTitle: 'Music Festival 2024',
    commissionPercentage: 8,
    clicks: 512,
    conversions: 42,
    totalEarned: 1250.75,
    status: 'active',
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    code: 'aff-workshop-001',
    eventId: 'evt-3',
    eventTitle: 'UX Workshop Series',
    commissionPercentage: 12,
    clicks: 89,
    conversions: 5,
    totalEarned: 240.00,
    status: 'inactive',
    createdAt: '2024-01-10',
  },
];

const mockTopAffiliates: TopAffiliate[] = [
  {
    id: 'aff-1',
    name: 'João Silva',
    email: 'joao.silva@example.com',
    totalSales: 5200.00,
    totalCommission: 520.00,
    conversionRate: 7.8,
    rank: 1,
  },
  {
    id: 'aff-2',
    name: 'Maria Santos',
    email: 'maria.santos@example.com',
    totalSales: 3800.00,
    totalCommission: 380.00,
    conversionRate: 6.5,
    rank: 2,
  },
  {
    id: 'aff-3',
    name: 'Pedro Oliveira',
    email: 'pedro.oliveira@example.com',
    totalSales: 2900.00,
    totalCommission: 232.00,
    conversionRate: 5.2,
    rank: 3,
  },
  {
    id: 'aff-4',
    name: 'Ana Costa',
    email: 'ana.costa@example.com',
    totalSales: 1800.00,
    totalCommission: 162.00,
    conversionRate: 4.1,
    rank: 4,
  },
  {
    id: 'aff-5',
    name: 'Carlos Martins',
    email: 'carlos.martins@example.com',
    totalSales: 1200.00,
    totalCommission: 96.00,
    conversionRate: 3.8,
    rank: 5,
  },
];

const mockCommissionHistory: CommissionHistory[] = [
  {
    id: 'comm-1',
    date: '2024-04-08',
    affiliateName: 'João Silva',
    affiliateEmail: 'joao.silva@example.com',
    eventTitle: 'TechConf 2024',
    saleAmount: 299.90,
    commissionPercentage: 10,
    commissionValue: 29.99,
    status: 'paid',
  },
  {
    id: 'comm-2',
    date: '2024-04-07',
    affiliateName: 'Maria Santos',
    affiliateEmail: 'maria.santos@example.com',
    eventTitle: 'Music Festival 2024',
    saleAmount: 189.90,
    commissionPercentage: 8,
    commissionValue: 15.19,
    status: 'paid',
  },
  {
    id: 'comm-3',
    date: '2024-04-06',
    affiliateName: 'Pedro Oliveira',
    affiliateEmail: 'pedro.oliveira@example.com',
    eventTitle: 'TechConf 2024',
    saleAmount: 449.90,
    commissionPercentage: 10,
    commissionValue: 44.99,
    status: 'pending',
  },
  {
    id: 'comm-4',
    date: '2024-04-05',
    affiliateName: 'Ana Costa',
    affiliateEmail: 'ana.costa@example.com',
    eventTitle: 'UX Workshop Series',
    saleAmount: 99.90,
    commissionPercentage: 12,
    commissionValue: 11.99,
    status: 'pending',
  },
];

const mockEvents = [
  { id: 'evt-1', title: 'TechConf 2024' },
  { id: 'evt-2', title: 'Music Festival 2024' },
  { id: 'evt-3', title: 'UX Workshop Series' },
  { id: 'evt-4', title: 'Marketing Summit' },
];

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
  const [selectedEvent, setSelectedEvent] = useState<string>('evt-1');
  const [commissionPercentage, setCommissionPercentage] = useState<number>(10);
  const [links] = useState<AffiliateLink[]>(mockAffiliateLinks);
  const [affiliates] = useState<TopAffiliate[]>(mockTopAffiliates);
  const [commissions] = useState<CommissionHistory[]>(mockCommissionHistory);

  // Calculate KPIs
  const totalAffiliates = affiliates.length;
  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const totalConversions = links.reduce((sum, link) => sum + link.conversions, 0);
  const totalCommissionPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.commissionValue, 0);

  const handleGenerateLink = () => {
    alert(`Link gerado para ${selectedEvent} com ${commissionPercentage}% de comissão`);
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/affiliate/${code}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado para a área de transferência!');
  };

  const handleDeactivateLink = (id: string) => {
    alert(`Link ${id} desativado`);
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
          <KpiCard
            title="Total de Afiliados"
            value={totalAffiliates.toString()}
            icon="users"
            color="blue"
          />
          <KpiCard
            title="Total de Cliques"
            value={totalClicks.toLocaleString('pt-BR')}
            icon="globe"
            color="green"
          />
          <KpiCard
            title="Conversões"
            value={totalConversions.toLocaleString('pt-BR')}
            icon="check-circle"
            color="orange"
          />
          <KpiCard
            title="Comissões Pagas"
            value={formatCurrency(totalCommissionPaid)}
            icon="dollar-sign"
            color="purple"
          />
        </div>

        {/* Create Affiliate Link Section */}
        <div className={sharedStyles.card}>
          <div className={sharedStyles.cardHeader}>
            <h2 className={sharedStyles.cardTitle}>Criar Link de Afiliado</h2>
          </div>
          <div className={styles.formContainer}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Evento</label>
              <select
                className={styles.select}
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
              >
                {mockEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title}
                  </option>
                ))}
              </select>
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
            <button className={sharedStyles.btnPrimary} onClick={handleGenerateLink}>
              <Icon name="plus" size={16} />
              Gerar Link
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
                {links.length === 0 ? (
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
            {affiliates.map((aff) => (
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
            ))}
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
                {commissions.length === 0 ? (
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
