import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import { formatCurrency, formatDateTime } from '@shared/lib/formatters';
import { Icon } from '@shared/ui/Icon/Icon';
import sharedStyles from './admin.shared.module.css';
import styles from './AdminFinance.module.css';

interface FinanceData {
  balance: {
    available: number;
    pending: number;
    total: number;
  };
  summary: {
    grossRevenue: number;
    fees: number;
    netRevenue: number;
    refunds: number;
    pendingPayout: number;
  };
  byMethod: { method: string; total: number; count: number }[];
  transactions: Transaction[];
  payouts: PayoutRequest[];
  revenueByEvent: RevenueByEvent[];
  total: number;
}

interface Transaction {
  id: string;
  description: string;
  type: 'entrada' | 'saída' | 'split';
  amount: number;
  paymentMethod: string;
  eventName?: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

interface PayoutRequest {
  id: string;
  amount: number;
  method: 'pix' | 'ted' | 'deposito';
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  requestedAt: string;
  completedAt?: string;
}

interface RevenueByEvent {
  id: string;
  name: string;
  ticketsSold: number;
  grossRevenue: number;
  platformFee: number;
  netRevenue: number;
}

const TYPE_MAP: Record<Transaction['type'], { label: string; cls: string; sign: '+' | '-' }> = {
  entrada: { label: 'Entrada',  cls: sharedStyles.badgeGreen,  sign: '+' },
  saída:   { label: 'Saída',    cls: sharedStyles.badgeRed,    sign: '-' },
  split:   { label: 'Split',    cls: sharedStyles.badgePurple, sign: '-' },
};

const STATUS_MAP: Record<PayoutRequest['status'], { label: string; cls: string }> = {
  pending:   { label: 'Pendente',   cls: sharedStyles.badgeYellow },
  approved:  { label: 'Aprovado',   cls: sharedStyles.badgeBlue },
  completed: { label: 'Concluído',  cls: sharedStyles.badgeGreen },
  rejected:  { label: 'Rejeitado',  cls: sharedStyles.badgeRed },
};

interface PayoutModalState {
  isOpen: boolean;
  amount: string;
  method: 'pix' | 'ted' | 'deposito';
}

const AdminFinance: React.FC = () => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [payoutModal, setPayoutModal] = useState<PayoutModalState>({
    isOpen: false,
    amount: '',
    method: 'pix',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-finance', period],
    queryFn: async () => {
      const res = await api.get<FinanceData>(`/v1/admin/finance/balance?period=${period}`);
      return res.data!;
    },
  });

  const balance = data?.balance;
  const summary = data?.summary;
  const transactions = data?.transactions ?? [];
  const payouts = data?.payouts ?? [];
  const revenueByEvent = data?.revenueByEvent ?? [];
  // const byMethod = data?.byMethod ?? [];

  const handleOpenPayoutModal = () => {
    setPayoutModal({ isOpen: true, amount: '', method: 'pix' });
  };

  const handleClosePayoutModal = () => {
    setPayoutModal({ isOpen: false, amount: '', method: 'pix' });
  };

  const handleSubmitPayout = () => {
    if (payoutModal.amount && balance) {
      const amountNum = parseFloat(payoutModal.amount);
      if (amountNum > 0 && amountNum <= balance.available) {
        console.log('Payout requested:', {
          amount: amountNum,
          method: payoutModal.method,
        });
        handleClosePayoutModal();
      }
    }
  };

  return (
    <AdminLayout>
      <div className={sharedStyles.page}>
        {/* Header */}
        <div className={sharedStyles.pageHeader}>
          <div>
            <h1 className={sharedStyles.pageTitle}>Financeiro</h1>
            <p className={sharedStyles.pageSubtitle}>Saldo em tempo real, transações e saques</p>
          </div>
          <div className={styles.periodToggle}>
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                className={`${styles.periodBtn} ${period === p ? styles.periodBtnActive : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
              </button>
            ))}
          </div>
        </div>

        {/* Balance Section */}
        <div className={styles.balanceSection}>
          <div className={styles.balanceCard}>
            <div className={styles.balanceLabel}>Saldo Disponível</div>
            <div className={styles.balanceAmount}>
              {isLoading ? '—' : formatCurrency(balance?.available ?? 0)}
            </div>
            <div className={styles.balanceSubtext}>Para sacar imediatamente</div>
            <button
              className={styles.requestPayoutBtn}
              onClick={handleOpenPayoutModal}
              disabled={isLoading || !balance || balance.available === 0}
            >
              <Icon name="dollar-sign" size={16} />
              Solicitar Saque
            </button>
          </div>

          <div className={styles.balanceSecondaryCard}>
            <div className={styles.secondaryLabel}>A Receber</div>
            <div className={styles.secondaryAmount}>
              {isLoading ? '—' : formatCurrency(balance?.pending ?? 0)}
            </div>
            <div className={styles.secondarySubtext}>Será creditado em 7-15 dias</div>
          </div>

          <div className={styles.balanceSecondaryCard}>
            <div className={styles.secondaryLabel}>Receita Total</div>
            <div className={styles.secondaryAmount}>
              {isLoading ? '—' : formatCurrency(balance?.total ?? 0)}
            </div>
            <div className={styles.secondarySubtext}>Disponível + A Receber</div>
          </div>
        </div>

        {/* KPIs Row */}
        <div className={sharedStyles.kpiRow}>
          {[
            { label: 'Receita Mês',      value: summary?.grossRevenue,  sub: 'Total de vendas' },
            { label: 'Saques Concluídos', value: summary?.netRevenue,   sub: 'Transferências realizadas' },
            { label: 'Saques Pendentes',  value: summary?.pendingPayout, sub: 'Aguardando processamento' },
            { label: 'Taxa Plataforma',   value: summary?.fees,         sub: '5% sobre vendas' },
          ].map(({ label, value, sub }) => (
            <div key={label} className={sharedStyles.kpiMini}>
              <p className={sharedStyles.kpiMiniLabel}>{label}</p>
              <p className={sharedStyles.kpiMiniValue}>{isLoading ? '—' : formatCurrency(value ?? 0)}</p>
              <p className={sharedStyles.kpiMiniSub}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Transactions Section */}
        <div className={sharedStyles.card}>
          <div className={sharedStyles.cardHeader}>
            <h2 className={sharedStyles.cardTitle}>Extrato de Movimentações</h2>
            <button className={sharedStyles.btnSecondary}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar
            </button>
          </div>
          <div className={sharedStyles.tableWrapper}>
            <table className={sharedStyles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Evento</th>
                  <th>Valor</th>
                  <th>Método</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j}>
                          <div className={sharedStyles.skeletonCell} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={sharedStyles.emptyRow}>Nenhuma transação</td>
                  </tr>
                ) : (
                  transactions.map((t) => {
                    const typeInfo = TYPE_MAP[t.type] ?? { label: t.type, cls: sharedStyles.badgeGray, sign: '+' as const };
                    return (
                      <tr key={t.id}>
                        <td className={sharedStyles.tdMuted}>{formatDateTime(t.createdAt).split(' ')[0]}</td>
                        <td className={sharedStyles.tdTruncate}>{t.description}</td>
                        <td>
                          <span className={`${sharedStyles.badge} ${typeInfo.cls}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className={sharedStyles.tdMuted}>{t.eventName || '-'}</td>
                        <td className={`${sharedStyles.tdBold} ${typeInfo.sign === '+' ? sharedStyles.amountPositive : sharedStyles.amountNegative}`}>
                          {typeInfo.sign}{formatCurrency(t.amount)}
                        </td>
                        <td className={sharedStyles.tdMuted}>{t.paymentMethod}</td>
                        <td>
                          <span className={`${sharedStyles.badge} ${t.status === 'completed' ? sharedStyles.badgeGreen : t.status === 'pending' ? sharedStyles.badgeYellow : sharedStyles.badgeRed}`}>
                            {t.status === 'completed' ? 'Concluída' : t.status === 'pending' ? 'Pendente' : 'Falhou'}
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

        {/* Payout Requests Section */}
        <div className={sharedStyles.card}>
          <div className={sharedStyles.cardHeader}>
            <h2 className={sharedStyles.cardTitle}>Solicitações de Saque</h2>
          </div>
          <div className={sharedStyles.tableWrapper}>
            <table className={sharedStyles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Método</th>
                  <th>Status</th>
                  <th>Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j}>
                          <div className={sharedStyles.skeletonCell} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={sharedStyles.emptyRow}>Nenhuma solicitação de saque</td>
                  </tr>
                ) : (
                  payouts.map((p) => {
                    const statusInfo = STATUS_MAP[p.status];
                    const methodLabel = p.method === 'pix' ? 'PIX' : p.method === 'ted' ? 'TED' : 'Depósito';
                    return (
                      <tr key={p.id}>
                        <td className={sharedStyles.tdMuted}>{formatDateTime(p.requestedAt).split(' ')[0]}</td>
                        <td className={sharedStyles.tdBold}>{formatCurrency(p.amount)}</td>
                        <td className={sharedStyles.tdMuted}>{methodLabel}</td>
                        <td>
                          <span className={`${sharedStyles.badge} ${statusInfo.cls}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className={sharedStyles.tdMuted}>
                          {p.completedAt ? formatDateTime(p.completedAt).split(' ')[0] : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue by Event */}
        <div className={sharedStyles.card}>
          <div className={sharedStyles.cardHeader}>
            <h2 className={sharedStyles.cardTitle}>Receita por Evento</h2>
          </div>
          <div className={sharedStyles.tableWrapper}>
            <table className={sharedStyles.table}>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Ingressos Vendidos</th>
                  <th>Receita Bruta</th>
                  <th>Taxa Plataforma</th>
                  <th>Líquido ao Produtor</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j}>
                          <div className={sharedStyles.skeletonCell} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : revenueByEvent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={sharedStyles.emptyRow}>Nenhum evento com receita</td>
                  </tr>
                ) : (
                  revenueByEvent.map((e) => (
                    <tr key={e.id}>
                      <td className={sharedStyles.tdTruncate}>{e.name}</td>
                      <td className={sharedStyles.tdBold}>{e.ticketsSold.toLocaleString('pt-BR')}</td>
                      <td className={sharedStyles.tdBold}>{formatCurrency(e.grossRevenue)}</td>
                      <td className={sharedStyles.tdMuted}>{formatCurrency(e.platformFee)}</td>
                      <td className={`${sharedStyles.tdBold} ${sharedStyles.amountPositive}`}>
                        {formatCurrency(e.netRevenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payout Modal */}
      {payoutModal.isOpen && (
        <div className={styles.modalOverlay} onClick={handleClosePayoutModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Solicitar Saque</h2>
              <button className={styles.modalCloseBtn} onClick={handleClosePayoutModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.infoBox}>
                <p className={styles.infoLabel}>Saldo Disponível</p>
                <p className={styles.infoValue}>{formatCurrency(balance?.available ?? 0)}</p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Valor do Saque (R$)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="0,00"
                  value={payoutModal.amount}
                  onChange={(e) =>
                    setPayoutModal((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  step="0.01"
                  min="0"
                  max={balance?.available ?? 0}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Método de Transferência</label>
                <select
                  className={styles.input}
                  value={payoutModal.method}
                  onChange={(e) =>
                    setPayoutModal((prev) => ({
                      ...prev,
                      method: e.target.value as 'pix' | 'ted' | 'deposito',
                    }))
                  }
                >
                  <option value="pix">PIX (Instantâneo)</option>
                  <option value="ted">TED (1-2 horas)</option>
                  <option value="deposito">Depósito em Conta (1-3 dias)</option>
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={handleClosePayoutModal}>
                Cancelar
              </button>
              <button
                className={styles.btnSubmit}
                onClick={handleSubmitPayout}
                disabled={!payoutModal.amount || parseFloat(payoutModal.amount) <= 0}
              >
                Solicitar Saque
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminFinance;
