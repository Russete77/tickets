import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { api } from '@shared/lib/api';
import { formatCurrency, formatDateTime } from '@shared/lib/formatters';
import { downloadCSV } from '@shared/lib/csvExport';
import styles from './admin.shared.module.css';

interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  eventTitle: string;
  items: number;
  amount: number;
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  status: 'confirmed' | 'pending' | 'cancelled' | 'refunded';
  createdAt: string;
}

const STATUS_MAP: Record<Order['status'], { label: string; cls: string }> = {
  confirmed: { label: 'Confirmado', cls: styles.badgeGreen  },
  pending:   { label: 'Pendente',   cls: styles.badgeYellow },
  cancelled: { label: 'Cancelado',  cls: styles.badgeRed    },
  refunded:  { label: 'Reembolsado',cls: styles.badgePurple },
};

const PAYMENT_LABELS: Record<Order['paymentMethod'], string> = {
  credit_card: 'Cartão',
  pix: 'Pix',
  boleto: 'Boleto',
};

const PAGE_SIZE = 10;

const AdminOrders: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ search, status: statusFilter, page: String(page), limit: String(PAGE_SIZE) });
      const res = await api.get<{ orders: Order[]; total: number }>(`/v1/admin/orders?${params}`);
      return res.data!;
    },
  });

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExport = () => {
    downloadCSV(
      orders.map((o) => ({
        ID: o.id,
        Cliente: o.customerName,
        Email: o.customerEmail,
        Evento: o.eventTitle,
        Itens: o.items,
        Pagamento: PAYMENT_LABELS[o.paymentMethod],
        Valor: formatCurrency(o.amount),
        Data: formatDateTime(o.createdAt),
        Status: o.status,
      })),
      'pedidos',
    );
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Pedidos</h1>
            <p className={styles.pageSubtitle}>{total} pedidos no total</p>
          </div>
          <button className={styles.btnSecondary} onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar CSV
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.toolbar}>
              <div className={styles.searchWrapper}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className={styles.searchInput}
                  placeholder="Buscar por cliente, evento ou ID..."
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
                <option value="confirmed">Confirmados</option>
                <option value="pending">Pendentes</option>
                <option value="cancelled">Cancelados</option>
                <option value="refunded">Reembolsados</option>
              </select>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Evento</th>
                  <th>Itens</th>
                  <th>Pagamento</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 9 }).map((__, j) => (
                      <td key={j}><div className={styles.skeletonCell} /></td>
                    ))}</tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr><td colSpan={9} className={styles.emptyRow} style={{ padding: '3rem' }}>Nenhum pedido encontrado</td></tr>
                ) : (
                  orders.map((o) => {
                    const s = STATUS_MAP[o.status] ?? { label: o.status, cls: styles.badgeGray };
                    return (
                      <tr key={o.id}>
                        <td className={styles.tdMono}>#{o.id.slice(-8).toUpperCase()}</td>
                        <td>
                          <div className={styles.avatarCell}>
                            <div className={styles.avatarInitials}>{o.customerName.slice(0, 2).toUpperCase()}</div>
                            <div>
                              <div className={styles.avatarName}>{o.customerName}</div>
                              <div className={styles.avatarEmail}>{o.customerEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className={styles.tdTruncate}>{o.eventTitle}</td>
                        <td className={styles.tdMuted}>{o.items} ingresso{o.items > 1 ? 's' : ''}</td>
                        <td className={styles.tdMuted}>{PAYMENT_LABELS[o.paymentMethod]}</td>
                        <td className={styles.tdBold}>{formatCurrency(o.amount)}</td>
                        <td className={styles.tdMuted}>{formatDateTime(o.createdAt)}</td>
                        <td><span className={`${styles.badge} ${s.cls}`}>{s.label}</span></td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              className={styles.actionBtn}
                              title="Ver detalhes"
                              onClick={() => navigate(`/orders/${o.id}`)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
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

export default AdminOrders;
